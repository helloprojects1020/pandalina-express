-- ============================================================
-- submit_group_order v2
-- Creates a real order + order_items when a group order
-- is submitted. Returns the created order UUID.
--
-- Also adds group_order_id to orders so the admin can link
-- back from an order to the group order that spawned it.
-- ============================================================

-- ─── 1. Link orders → group_orders ───────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS group_order_id UUID REFERENCES public.group_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_group_order_id_idx ON public.orders(group_order_id);

-- ─── 2. Replace submit_group_order RPC ───────────────────────
--
-- Previous version: just flipped status to 'submitted', returned void.
-- New version:
--   a. Validates status is open or locked.
--   b. Calculates grand total from participants.
--   c. Inserts an order (source = 'group_order').
--   d. Inserts order_items for every group_order_items row,
--      prefixing the participant name so kitchen staff know
--      which part belongs to whom.
--   e. Updates group_orders.final_order_id + status.
--   f. Returns the created order UUID.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_group_order(p_group_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_go          public.group_orders%ROWTYPE;
  v_subtotal    NUMERIC(10,2);
  v_order_id    UUID;
BEGIN
  -- ── Fetch & validate ─────────────────────────────────────
  SELECT * INTO v_go
  FROM public.group_orders
  WHERE id = p_group_order_id
    AND status IN ('open','locked');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_order % not found or already submitted', p_group_order_id;
  END IF;

  -- ── Grand total ──────────────────────────────────────────
  SELECT COALESCE(SUM(subtotal), 0)
  INTO   v_subtotal
  FROM   public.group_order_participants
  WHERE  group_order_id = p_group_order_id;

  -- ── Create order ─────────────────────────────────────────
  INSERT INTO public.orders (
    restaurant_id,
    customer_name,
    customer_phone,
    order_type,
    status,
    source,
    subtotal,
    delivery_fee,
    total,
    payment_method,
    payment_status,
    group_order_id,
    notes
  ) VALUES (
    v_go.restaurant_id,
    v_go.host_name,
    v_go.host_phone,
    'pickup',
    'new',
    'group_order',
    v_subtotal,
    0,
    v_subtotal,
    CASE WHEN v_go.payment_mode = 'host_pays_all' THEN 'cash' ELSE 'split' END,
    'unpaid',
    p_group_order_id,
    v_go.notes
  )
  RETURNING id INTO v_order_id;

  -- ── Create order_items ────────────────────────────────────
  -- name_he = "[participant name]: [item name]" so the kitchen
  -- can see who ordered what at a glance.
  INSERT INTO public.order_items (
    order_id,
    menu_item_id,
    name_he,
    quantity,
    unit_price
  )
  SELECT
    v_order_id,
    goi.menu_item_id,
    CONCAT(gop.name, ': ', goi.name) AS name_he,
    goi.quantity,
    goi.unit_price
  FROM  public.group_order_items       goi
  JOIN  public.group_order_participants gop ON gop.id = goi.participant_id
  WHERE goi.group_order_id = p_group_order_id;

  -- ── Update group_order ────────────────────────────────────
  UPDATE public.group_orders
  SET    status         = 'submitted',
         submitted_at   = now(),
         final_order_id = v_order_id,
         updated_at     = now()
  WHERE  id = p_group_order_id;

  RETURN v_order_id;
END;
$$;
