
-- ============================================================
-- Migration: include ingredient name in OUT_OF_STOCK error
-- ============================================================
-- Extends fn_deduct_inventory_on_order_item so that when it
-- rejects an order due to insufficient stock, the error message
-- also carries the inventory item (ingredient) name:
--
--   OUT_OF_STOCK:<menu_item_name>:<ingredient_name>
--
-- createOrder.ts parses both segments to produce a richer
-- user-facing message, e.g.:
--   "אסדואקי אזל מהמלאי (סלמון אזל). אנא עדכן את הזמנתך."
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
  v_inv_name      TEXT;
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

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Respect per-restaurant opt-in flag
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

    -- Lock row and fetch both stock and name in one read
    SELECT current_stock, name
    INTO   v_inv_stock, v_inv_name
    FROM   public.inventory_items
    WHERE  id = v_recipe.inventory_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Reject if stock is insufficient; include ingredient name
    IF v_inv_stock < v_qty_used THEN
      RAISE EXCEPTION 'OUT_OF_STOCK:%:%',
        COALESCE(NEW.menu_item_name, 'פריט'),
        COALESCE(v_inv_name, '');
    END IF;

    v_new_stock := GREATEST(0, v_inv_stock - v_qty_used);

    UPDATE public.inventory_items
    SET    current_stock = v_new_stock,
           updated_at    = now()
    WHERE  id = v_recipe.inventory_item_id;

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