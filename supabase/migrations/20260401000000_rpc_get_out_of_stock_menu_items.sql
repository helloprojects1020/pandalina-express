-- ============================================================
-- RPC: get_out_of_stock_menu_items(p_restaurant_id UUID)
-- ============================================================
-- Returns the menu_item_id of every active menu item whose
-- recipe requires at least one ingredient with current_stock = 0.
--
-- Called by useMenu (Step 3) to populate outOfStockIds on the
-- storefront. Used to visually disable out-of-stock products
-- in ProductCard, ProductModal, and Recommendations.
--
-- SECURITY DEFINER: runs as the function owner so that the
-- anon role can read inventory_items and menu_item_ingredients
-- without needing direct SELECT grants on those tables.
--
-- Returns: table(menu_item_id uuid)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_out_of_stock_menu_items(
  p_restaurant_id UUID
)
RETURNS TABLE(menu_item_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT mmi.menu_item_id
  FROM   public.menu_item_ingredients  mmi
  JOIN   public.inventory_items        inv  ON inv.id = mmi.inventory_item_id
  JOIN   public.menu_items             mi   ON mi.id  = mmi.menu_item_id
  WHERE  mi.restaurant_id             = p_restaurant_id
    AND  mi.is_active                 = true
    AND  mmi.inventory_item_id        IS NOT NULL
    AND  inv.current_stock            = 0;
$$;

-- Allow the anon and authenticated roles to call this function.
-- Data access is controlled inside the function body via SECURITY DEFINER;
-- the roles never get direct access to the underlying tables.
GRANT EXECUTE ON FUNCTION public.get_out_of_stock_menu_items(UUID)
  TO anon, authenticated;