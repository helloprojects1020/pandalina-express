
-- ============================================================
-- Migration: add server-side stock validation to the inventory
-- deduction trigger.
-- ============================================================
-- When inventory_tracking_enabled = true for the restaurant,
-- the trigger now REJECTS an order_items INSERT if any
-- ingredient required by the menu item has insufficient stock.
--
-- Error format: 'OUT_OF_STOCK:<menu_item_name>'
-- createOrder.ts catches this prefix and surfaces a clean
-- user-facing message.
--
-- GREATEST(0, ...) is retained as a safety net after the
-- validation passes (e.g. floating-point rounding edge cases).
-- ============================================================


CREATE OR REPLACE FUNCTION public.fn_deduct_inventory_on_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_recipe        RECORD;
  v_inv_stock     NUMERIC;
  v_new_stock     NUMERIC;
  v_qty_used      NUMERIC;
BEGIN

  -- Skip freeform / custom items with no menu_item_id
  IF NEW.menu_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve restaurant_id from the parent order
  SELECT restaurant_id
  INTO   v_restaurant_id
  FROM   public.orders
  WHERE  id = NEW.order_id;

  -- Defensive: parent order missing (should never happen in normal flow)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Respect per-restaurant opt-in flag.
  -- If inventory_tracking_enabled is false (or the settings row is
  -- missing), skip deduction AND validation entirely.
  PERFORM 1
  FROM    public.restaurant_settings
  WHERE   restaurant_id              = v_restaurant_id
    AND   inventory_tracking_enabled = true;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- ── Per-ingredient loop ────────────────────────────────────

  FOR v_recipe IN
    SELECT
      mmi.inventory_item_id,
      mmi.quantity AS qty_per_unit
    FROM public.menu_item_ingredients mmi
    WHERE mmi.menu_item_id      = NEW.menu_item_id
      AND mmi.inventory_item_id IS NOT NULL
  LOOP

    v_qty_used := v_recipe.qty_per_unit * NEW.quantity;

    -- Acquire a row-level lock before reading stock.
    -- Guarantees the read + update is atomic; concurrent
    -- transactions for the same ingredient will queue here.
    SELECT current_stock
    INTO   v_inv_stock
    FROM   public.inventory_items
    WHERE  id = v_recipe.inventory_item_id
    FOR UPDATE;

    -- inventory_item_id FK points to a deleted row — skip
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- ── Server-side stock validation ──────────────────────
    -- Reject the insert (and roll back the whole order) when
    -- the ingredient stock is insufficient.
    -- The error prefix 'OUT_OF_STOCK:' is parsed by createOrder.ts
    -- to produce a clean user-facing message.
    IF v_inv_stock < v_qty_used THEN
      RAISE EXCEPTION 'OUT_OF_STOCK:%', COALESCE(NEW.menu_item_name, 'פריט');
    END IF;

    -- Deduct stock; GREATEST(0, ...) is a safety net for
    -- floating-point edge cases after the check above.
    v_new_stock := GREATEST(0, v_inv_stock - v_qty_used);

    UPDATE public.inventory_items
    SET    current_stock = v_new_stock,
           updated_at    = now()
    WHERE  id = v_recipe.inventory_item_id;

    -- Record the movement for audit / AdminInventory view
    INSERT INTO public.inventory_movements (
      restaurant_id,
      inventory_item_id,
      order_id,
      menu_item_name,
      quantity_used,
      movement_type,
      notes
    ) VALUES (
      v_restaurant_id,
      v_recipe.inventory_item_id,
      NEW.order_id,
      COALESCE(NEW.menu_item_name, 'פריט'),
      v_qty_used,
      'order',
      'הזמנה אוטומטית'
    );

  END LOOP;

  RETURN NEW;
END;
$$;


-- Trigger definition is unchanged; recreating it is idempotent
-- because CREATE OR REPLACE FUNCTION already updated the body.
-- We drop + recreate here only to make this migration fully
-- self-contained if applied to a fresh schema.

DROP TRIGGER IF EXISTS trg_deduct_inventory_on_order_item
  ON public.order_items;

CREATE TRIGGER trg_deduct_inventory_on_order_item
  AFTER INSERT
  ON     public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_deduct_inventory_on_order_item();