
-- ============================================================
-- SECURITY FIX: Multi-tenant RLS isolation
-- ============================================================
-- Problem: all admin policies used has_role(auth.uid(), 'admin')
-- which is a GLOBAL check with no restaurant_id scope.
-- Any admin of restaurant A could read/write restaurant B's data.
--
-- Root cause: the app writes to `restaurant_users` for auth,
-- but RLS was checking `user_roles`. has_restaurant_role() was
-- never populated, so we introduce is_restaurant_member() that
-- checks the correct table.
-- ============================================================


-- ── 1. restaurant_users table ────────────────────────────────
-- This table exists in the live DB but was never in a migration.
-- Create it here idempotently so the migration is self-contained.

CREATE TABLE IF NOT EXISTS public.restaurant_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'owner',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

ALTER TABLE public.restaurant_users ENABLE ROW LEVEL SECURITY;

-- Users can read only their own memberships (needed by useAuth.tsx)
DROP POLICY IF EXISTS "Users can read own restaurant memberships" ON public.restaurant_users;
CREATE POLICY "Users can read own restaurant memberships"
  ON public.restaurant_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- All mutations go through the service role (create-admin edge function).
-- No user-level INSERT / UPDATE / DELETE policies intentionally.


-- ── 2. Helper: is_restaurant_member ──────────────────────────
-- SECURITY DEFINER so it can read restaurant_users regardless
-- of the calling user's own RLS context.

CREATE OR REPLACE FUNCTION public.is_restaurant_member(
  _user_id       UUID,
  _restaurant_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.restaurant_users
    WHERE  user_id       = _user_id
      AND  restaurant_id = _restaurant_id
      AND  is_active     = true
  )
$$;


-- ── 3. restaurants ───────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage restaurants" ON public.restaurants;
CREATE POLICY "Admins can manage own restaurant"
  ON public.restaurants
  FOR ALL TO authenticated
  USING      (public.is_restaurant_member(auth.uid(), id))
  WITH CHECK (public.is_restaurant_member(auth.uid(), id));


-- ── 4. categories ────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage own restaurant categories"
  ON public.categories
  FOR ALL TO authenticated
  USING      (public.is_restaurant_member(auth.uid(), restaurant_id))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));


-- ── 5. menu_items ────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
CREATE POLICY "Admins can manage own restaurant menu items"
  ON public.menu_items
  FOR ALL TO authenticated
  USING      (public.is_restaurant_member(auth.uid(), restaurant_id))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));


-- ── 6. menu_item_options ─────────────────────────────────────
-- No direct restaurant_id column: join through menu_items.

DROP POLICY IF EXISTS "Admins can manage options" ON public.menu_item_options;
CREATE POLICY "Admins can manage own restaurant options"
  ON public.menu_item_options
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE  mi.id = menu_item_id
        AND  public.is_restaurant_member(auth.uid(), mi.restaurant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE  mi.id = menu_item_id
        AND  public.is_restaurant_member(auth.uid(), mi.restaurant_id)
    )
  );


-- ── 7. orders ────────────────────────────────────────────────
-- Public INSERT (customers ordering) is kept from the previous
-- migration. The admin policy scopes SELECT/UPDATE/DELETE to
-- their own restaurant.

DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Admins can manage own restaurant orders"
  ON public.orders
  FOR ALL TO authenticated
  USING      (public.is_restaurant_member(auth.uid(), restaurant_id))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));


-- ── 8. order_items ───────────────────────────────────────────
-- No direct restaurant_id: join through orders.

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage own restaurant order items"
  ON public.order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE  o.id = order_id
        AND  public.is_restaurant_member(auth.uid(), o.restaurant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE  o.id = order_id
        AND  public.is_restaurant_member(auth.uid(), o.restaurant_id)
    )
  );


-- ── 9. restaurant_settings ───────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage settings" ON public.restaurant_settings;
CREATE POLICY "Admins can manage own restaurant settings"
  ON public.restaurant_settings
  FOR ALL TO authenticated
  USING      (public.is_restaurant_member(auth.uid(), restaurant_id))
  WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));


-- ── 10. user_roles ───────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage own restaurant roles"
  ON public.user_roles
  FOR ALL TO authenticated
  USING (
    restaurant_id IS NOT NULL
    AND public.is_restaurant_member(auth.uid(), restaurant_id)
  )
  WITH CHECK (
    restaurant_id IS NOT NULL
    AND public.is_restaurant_member(auth.uid(), restaurant_id)
  );


-- ── 11. storage: menu-images ─────────────────────────────────
-- Previously: any global admin could upload/update/delete.
-- Now: any active restaurant member can manage images.
-- Path-based per-restaurant scoping can be added later when the
-- upload paths include the restaurant_id prefix.

DROP POLICY IF EXISTS "Admins can upload menu images"  ON storage.objects;
DROP POLICY IF EXISTS "Admins can update menu images"  ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete menu images"  ON storage.objects;

CREATE POLICY "Restaurant members can upload menu images"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'menu-images'
    AND EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE  ru.user_id   = auth.uid()
        AND  ru.is_active = true
    )
  );

CREATE POLICY "Restaurant members can update menu images"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE  ru.user_id   = auth.uid()
        AND  ru.is_active = true
    )
  );

CREATE POLICY "Restaurant members can delete menu images"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'menu-images'
    AND EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE  ru.user_id   = auth.uid()
        AND  ru.is_active = true
    )
  );
