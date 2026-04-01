-- ============================================================
-- Payment system: orders columns + payments table
-- ============================================================
-- Adds the columns that createOrder.ts already tries to INSERT
-- (source, payment_method, payment_status, latitude, longitude)
-- and creates the payments table that AdminOrders.tsx already
-- queries (id, status, provider, amount, provider_payment_id,
-- paid_at, created_at).
-- ============================================================


-- ── 1. orders: add missing columns ───────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source           TEXT    DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS payment_method   TEXT    DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status   TEXT    DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS latitude         NUMERIC(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude        NUMERIC(10,7) DEFAULT NULL;


-- ── 2. restaurant_settings: online_payment_enabled ───────────
-- Referenced in CheckoutSheet.tsx but may not exist in schema.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS online_payment_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payplus_api_key         TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payplus_secret_key      TEXT    DEFAULT NULL;


-- ── 3. payments table ─────────────────────────────────────────
-- AdminOrders.tsx queries: id, status, provider, amount,
-- provider_payment_id, paid_at, created_at.
-- Webhook updates: status, provider_payment_id, paid_at.

CREATE TABLE IF NOT EXISTS public.payments (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id        UUID        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider             TEXT        NOT NULL DEFAULT 'payplus',
  amount               NUMERIC(10,2) NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'pending',
                                   -- pending | paid | failed | cancelled
  provider_payment_id  TEXT        DEFAULT NULL,  -- PayPlus transaction / page ID
  provider_page_id     TEXT        DEFAULT NULL,  -- PayPlus payment page ID
  payment_url          TEXT        DEFAULT NULL,  -- URL returned to frontend
  success_url          TEXT        DEFAULT NULL,
  failure_url          TEXT        DEFAULT NULL,
  raw_webhook          JSONB       DEFAULT NULL,  -- full webhook payload for audit
  paid_at              TIMESTAMPTZ DEFAULT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for order lookups (AdminOrders queries by order_id)
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_provider_payment_id_idx ON public.payments(provider_payment_id);

-- RLS: admins can read payments for their restaurant
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant members can read payments"
  ON public.payments FOR SELECT
  USING (public.is_restaurant_member(restaurant_id));

-- Service role (used by edge functions) bypasses RLS automatically.
-- Anon cannot read payments at all.


-- ── 4. updated_at trigger for payments ───────────────────────

CREATE OR REPLACE FUNCTION public.set_payments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_payments_updated_at();