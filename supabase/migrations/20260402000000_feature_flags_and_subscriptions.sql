-- ============================================================
-- Feature Flags + Subscription System
-- Bitelyx Platform — Monetization Layer
-- ============================================================

-- ── 1. plans ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plans (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT         NOT NULL,
  slug           TEXT         NOT NULL UNIQUE,
  price_monthly  NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly   NUMERIC(10,2) NOT NULL DEFAULT 0,
  description    TEXT,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans are publicly readable"
  ON public.plans FOR SELECT USING (true);


-- ── 2. features ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.features (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "features are publicly readable"
  ON public.features FOR SELECT USING (true);


-- ── 3. plan_features ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plan_features (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id    UUID    NOT NULL REFERENCES public.plans(id)    ON DELETE CASCADE,
  feature_id UUID    NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(plan_id, feature_id)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_features are publicly readable"
  ON public.plan_features FOR SELECT USING (true);


-- ── 4. restaurant_subscriptions ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.restaurant_subscriptions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan_id       UUID        NOT NULL REFERENCES public.plans(id),
  status        TEXT        NOT NULL DEFAULT 'active',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ DEFAULT NULL,
  notes         TEXT        DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_subscriptions_restaurant
  ON public.restaurant_subscriptions(restaurant_id);

ALTER TABLE public.restaurant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant members can read own subscription"
  ON public.restaurant_subscriptions FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));


-- ── 5. restaurant_feature_overrides ───────────────────────────

CREATE TABLE IF NOT EXISTS public.restaurant_feature_overrides (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  feature_key   TEXT        NOT NULL,
  enabled       BOOLEAN     NOT NULL,
  notes         TEXT        DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_feature_overrides_restaurant
  ON public.restaurant_feature_overrides(restaurant_id);

ALTER TABLE public.restaurant_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant members can read own overrides"
  ON public.restaurant_feature_overrides FOR SELECT TO authenticated
  USING (public.is_restaurant_member(auth.uid(), restaurant_id));


-- ── 6. platform_admins ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_admins (
  email      TEXT        PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- Only the service role or platform admins themselves can read this table.
CREATE POLICY "platform admins can read own row"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (email = auth.email());


-- ── 7. Helper: is_platform_admin() ────────────────────────────

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE email = auth.email()
  )
$$;

-- Allow platform admins write access to subscriptions
CREATE POLICY "platform admins can manage subscriptions"
  ON public.restaurant_subscriptions FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Allow platform admins write access to overrides
CREATE POLICY "platform admins can manage feature overrides"
  ON public.restaurant_feature_overrides FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());


-- ── 8. updated_at triggers ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_restaurant_subscriptions_updated_at
  ON public.restaurant_subscriptions;
CREATE TRIGGER trg_restaurant_subscriptions_updated_at
  BEFORE UPDATE ON public.restaurant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

DROP TRIGGER IF EXISTS trg_restaurant_feature_overrides_updated_at
  ON public.restaurant_feature_overrides;
CREATE TRIGGER trg_restaurant_feature_overrides_updated_at
  BEFORE UPDATE ON public.restaurant_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();


-- ── 9. Seed: features ─────────────────────────────────────────

INSERT INTO public.features (key, name, description, category) VALUES
  ('orders',              'Orders',               'View and manage customer orders',           'operations'),
  ('menu',                'Menu Management',       'Manage categories, items, and options',     'operations'),
  ('customers',           'Customers',             'Customer directory and order history',      'operations'),
  ('delivery_zones',      'Delivery Zones',        'Define delivery areas and fees',            'operations'),
  ('analytics',           'Analytics',             'Revenue and order analytics dashboard',     'insights'),
  ('inventory',           'Inventory',             'Stock management and auto-deduction',       'operations'),
  ('reports',             'Reports X/Z',           'Daily X and end-of-day Z financial reports','insights'),
  ('daily',               'Daily Report',          'Operational daily summary report',          'insights'),
  ('staff',               'Staff',                 'Staff management and shift tracking',       'team'),
  ('menu_performance',    'Menu Performance',      'Per-item sales performance analysis',       'insights'),
  ('export',              'Export Reports',        'Export data to spreadsheets',               'insights'),
  ('costing',             'Costing & Profitability','Ingredient costing and margin analysis',   'finance'),
  ('whatsapp_automation', 'WhatsApp Automation',   'Automated WhatsApp messaging and alerts',  'marketing'),
  ('advanced_analytics',  'Advanced Analytics',    'Deep-dive analytics and cohort reports',    'insights')
ON CONFLICT (key) DO NOTHING;


-- ── 10. Seed: plans ───────────────────────────────────────────

INSERT INTO public.plans (name, slug, price_monthly, price_yearly, description, sort_order) VALUES
  ('Free',       'free',       0,    0,    'Core ordering and menu management', 0),
  ('Pro',        'pro',        149,  1490, 'Full operations suite for growing restaurants', 1),
  ('Enterprise', 'enterprise', 499,  4990, 'Everything including automation and advanced reports', 2)
ON CONFLICT (slug) DO NOTHING;


-- ── 11. Seed: plan_features ───────────────────────────────────

-- Free plan
INSERT INTO public.plan_features (plan_id, feature_id, enabled)
SELECT p.id, f.id, true
FROM public.plans p CROSS JOIN public.features f
WHERE p.slug = 'free' AND f.key IN ('orders', 'menu')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Pro plan
INSERT INTO public.plan_features (plan_id, feature_id, enabled)
SELECT p.id, f.id, true
FROM public.plans p CROSS JOIN public.features f
WHERE p.slug = 'pro'
  AND f.key IN (
    'orders', 'menu', 'customers', 'delivery_zones',
    'analytics', 'inventory', 'reports', 'daily',
    'staff', 'menu_performance', 'export'
  )
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Enterprise plan — all features
INSERT INTO public.plan_features (plan_id, feature_id, enabled)
SELECT p.id, f.id, true
FROM public.plans p CROSS JOIN public.features f
WHERE p.slug = 'enterprise'
ON CONFLICT (plan_id, feature_id) DO NOTHING;


-- ── 12. RPC: admin overview ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_all_restaurant_plans()
RETURNS TABLE (
  restaurant_id   UUID,
  restaurant_name TEXT,
  restaurant_slug TEXT,
  plan_slug       TEXT,
  plan_name       TEXT,
  status          TEXT,
  expires_at      TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.name,
    r.slug,
    COALESCE(p.slug, 'free') AS plan_slug,
    COALESCE(p.name, 'Free') AS plan_name,
    COALESCE(rs.status, 'active') AS status,
    rs.expires_at
  FROM public.restaurants r
  LEFT JOIN public.restaurant_subscriptions rs ON rs.restaurant_id = r.id
  LEFT JOIN public.plans p ON p.id = rs.plan_id
  WHERE r.is_active = true
  ORDER BY r.name;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_restaurant_plans() TO authenticated;
