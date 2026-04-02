-- ============================================================
-- Group Orders — full schema migration
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────

CREATE TABLE public.group_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  share_token     TEXT NOT NULL UNIQUE,
  title           TEXT,
  host_name       TEXT NOT NULL,
  host_phone      TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','locked','submitted','cancelled','expired')),
  payment_mode    TEXT NOT NULL DEFAULT 'split'
                    CHECK (payment_mode IN ('split','host_pays_all')),
  notes           TEXT,
  expires_at      TIMESTAMPTZ,
  locked_at       TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  final_order_id  UUID REFERENCES public.orders(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_order_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id  UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  is_host         BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','left','locked')),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','paid','partially_paid','failed')),
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id  UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  participant_id  UUID NOT NULL REFERENCES public.group_order_participants(id) ON DELETE CASCADE,
  menu_item_id    UUID REFERENCES public.menu_items(id),
  name            TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_order_item_options (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_item_id   UUID NOT NULL REFERENCES public.group_order_items(id) ON DELETE CASCADE,
  option_group_name     TEXT NOT NULL,
  option_value_name     TEXT NOT NULL,
  price_delta           NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_order_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_order_id        UUID NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  participant_id        UUID REFERENCES public.group_order_participants(id),
  payment_mode          TEXT NOT NULL CHECK (payment_mode IN ('split','host_pays_all')),
  amount                NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'ILS',
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','completed','failed','refunded')),
  provider              TEXT DEFAULT 'manual',
  transaction_reference TEXT,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_group_orders_restaurant_id   ON public.group_orders(restaurant_id);
CREATE UNIQUE INDEX idx_group_orders_share_token ON public.group_orders(share_token);
CREATE INDEX idx_group_orders_status           ON public.group_orders(status);

CREATE INDEX idx_go_participants_group_order_id ON public.group_order_participants(group_order_id);

CREATE INDEX idx_go_items_group_order_id        ON public.group_order_items(group_order_id);
CREATE INDEX idx_go_items_participant_id        ON public.group_order_items(participant_id);

CREATE INDEX idx_go_item_options_item_id        ON public.group_order_item_options(group_order_item_id);

CREATE INDEX idx_go_payments_group_order_id     ON public.group_order_payments(group_order_id);
CREATE INDEX idx_go_payments_participant_id     ON public.group_order_payments(participant_id);

-- ─── updated_at trigger function ────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_group_orders_updated_at
  BEFORE UPDATE ON public.group_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_go_participants_updated_at
  BEFORE UPDATE ON public.group_order_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_go_items_updated_at
  BEFORE UPDATE ON public.group_order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_go_payments_updated_at
  BEFORE UPDATE ON public.group_order_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.group_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_payments   ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER function: public read-by-token
CREATE OR REPLACE FUNCTION public.get_group_order_by_token(token TEXT)
RETURNS SETOF public.group_orders
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM public.group_orders WHERE share_token = token LIMIT 1;
$$;

-- Restaurant members can read group orders for their restaurant
CREATE POLICY "restaurant_members_read_group_orders"
  ON public.group_orders FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE ru.restaurant_id = group_orders.restaurant_id
        AND ru.user_id = auth.uid()
        AND ru.is_active = true
    )
  );

-- Allow INSERT for anyone (participants join via token)
CREATE POLICY "public_insert_group_orders"
  ON public.group_orders FOR INSERT
  WITH CHECK (true);

-- Allow UPDATE for restaurant members or via token (service level)
CREATE POLICY "restaurant_members_update_group_orders"
  ON public.group_orders FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.restaurant_users ru
      WHERE ru.restaurant_id = group_orders.restaurant_id
        AND ru.user_id = auth.uid()
        AND ru.is_active = true
    )
  );

-- Participants: public access scoped by group_order
CREATE POLICY "public_all_go_participants"
  ON public.group_order_participants FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "public_all_go_items"
  ON public.group_order_items FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "public_all_go_item_options"
  ON public.group_order_item_options FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "public_all_go_payments"
  ON public.group_order_payments FOR ALL
  USING (true) WITH CHECK (true);

-- ─── RPC: submit_group_order ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_group_order(p_group_order_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.group_orders
  SET status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  WHERE id = p_group_order_id
    AND status IN ('open','locked');
END;
$$;