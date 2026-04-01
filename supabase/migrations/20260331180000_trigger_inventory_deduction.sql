
-- ============================================================
-- Trigger: automatic inventory deduction on order_items insert
-- ============================================================
-- Replaces client-side deductInventory() in createOrder.ts.
--
-- Flow:
--   Browser inserts order_items (anon) →
--   trigger fires FOR EACH ROW →
--   function reads menu_item_ingredients by menu_item_id →
--   deducts from inventory_items →
--   records in inventory_movements
--
-- SECURITY DEFINER: runs as the function owner, bypassing RLS
-- on inventory_items and inventory_movements regardless of
-- whether the calling client is anon or authenticated.
--
-- Does NOT rely on restaurant_id in menu_item_ingredients
-- (that column does not exist). restaurant_id is resolved
-- from the parent orders row via order_id.
--
-- ingredient_id in menu_item_ingredients is intentionally
-- ignored. inventory_item_id is the live source of truth
-- after the Phase 3 backfill.
-- ============================================================


-- ── Function ─────────────────────────────────────────────────

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

  -- Resolve restaurant_id from the parent order.
  -- Used only for inventory_movements; not a filter on recipes.
  SELECT restaurant_id
  INTO   v_restaurant_id
  FROM   public.orders
  WHERE  id = NEW.order_id;

  -- Defensive: parent order missing (should never happen in normal flow)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- ── Per-ingredient deduction loop ──────────────────────────
  -- Reads every recipe row for this menu_item that has an
  -- inventory_item_id. Rows with NULL inventory_item_id are
  -- excluded by the WHERE clause — no extra guard needed.

  FOR v_recipe IN
    SELECT
      mmi.inventory_item_id,
      mmi.quantity AS qty_per_unit
    FROM public.menu_item_ingredients mmi
    WHERE mmi.menu_item_id      = NEW.menu_item_id
      AND mmi.inventory_item_id IS NOT NULL
  LOOP

    v_qty_used := v_recipe.qty_per_unit * NEW.quantity;

    -- Lock this inventory row before reading.
    -- Prevents two concurrent transactions from both reading
    -- the same current_stock and producing the wrong new value.
    SELECT current_stock
    INTO   v_inv_stock
    FROM   public.inventory_items
    WHERE  id = v_recipe.inventory_item_id
    FOR UPDATE;

    -- inventory_item_id FK points to a deleted row — skip
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Deduct; floor at zero so stock never goes negative
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


-- ── Trigger ───────────────────────────────────────────────────

CREATE TRIGGER trg_deduct_inventory_on_order_item
  AFTER INSERT
  ON     public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_deduct_inventory_on_order_item();