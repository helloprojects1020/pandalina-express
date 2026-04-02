-- ============================================================
-- Group Order Payment Method (per participant) + Analytics view
-- ============================================================
-- Adds payment_method to group_order_participants so we can
-- distinguish:  none (not yet chosen) | cash | online
--
-- Also creates a group_orders_analytics view that the admin
-- dashboard can query without writing complex joins.
-- ============================================================

-- ─── 1. payment_method column ────────────────────────────────

ALTER TABLE public.group_order_participants
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'none'
    CHECK (payment_method IN ('none', 'cash', 'online'));

-- ─── 2. RPC: set_participant_payment_method ──────────────────
-- Allows a participant to declare how they intend to pay.
-- Sets payment_method and (if cash) marks payment_status as
-- 'unpaid' so the host knows to collect manually.

CREATE OR REPLACE FUNCTION public.set_participant_payment_method(
  p_participant_id UUID,
  p_method TEXT        -- 'cash' | 'online' | 'none'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_method NOT IN ('none', 'cash', 'online') THEN
    RAISE EXCEPTION 'invalid payment_method: %', p_method;
  END IF;

  UPDATE public.group_order_participants
  SET
    payment_method = p_method,
    -- If switching to 'online', keep payment_status until gateway confirms.
    -- If switching to 'cash', ensure status is 'unpaid' (host must mark paid).
    payment_status = CASE
      WHEN p_method = 'cash' AND payment_status = 'paid' THEN 'unpaid'
      ELSE payment_status
    END,
    updated_at = now()
  WHERE id = p_participant_id;
END;
$$;

-- ─── 3. Analytics view ───────────────────────────────────────

CREATE OR REPLACE VIEW public.group_orders_analytics AS
SELECT
  go.restaurant_id,
  COUNT(DISTINCT go.id)                                              AS total_orders,
  COUNT(DISTINCT go.id) FILTER (WHERE go.status = 'submitted')      AS completed_orders,
  COUNT(DISTINCT go.id) FILTER (WHERE go.status = 'open')           AS open_orders,
  COUNT(DISTINCT go.id) FILTER (WHERE go.status = 'cancelled'
                                    OR go.status = 'expired')       AS abandoned_orders,
  ROUND(
    COUNT(DISTINCT gop.id)::NUMERIC /
    NULLIF(COUNT(DISTINCT go.id), 0), 1
  )                                                                  AS avg_participants,
  COALESCE(AVG(go_totals.grand_total) FILTER (WHERE go.status = 'submitted'), 0)
                                                                     AS avg_order_value,
  COALESCE(SUM(go_totals.grand_total) FILTER (WHERE go.status = 'submitted'), 0)
                                                                     AS total_revenue,

  -- Payment method breakdown (across participants)
  COUNT(gop.id) FILTER (WHERE gop.payment_method = 'online' AND gop.payment_status = 'paid')
                                                                     AS paid_online,
  COUNT(gop.id) FILTER (WHERE gop.payment_method = 'cash')          AS cash_participants,
  COUNT(gop.id) FILTER (WHERE gop.payment_method = 'none' AND gop.payment_status = 'unpaid')
                                                                     AS unpaid_participants,

  -- Unpaid amount across all submitted orders
  COALESCE(SUM(
    CASE WHEN go.status = 'submitted' AND gop.payment_status = 'unpaid' THEN gop.subtotal ELSE 0 END
  ), 0)                                                              AS total_unpaid_amount

FROM public.group_orders go
LEFT JOIN public.group_order_participants gop ON gop.group_order_id = go.id
LEFT JOIN (
  SELECT group_order_id, SUM(subtotal) AS grand_total
  FROM public.group_order_participants
  GROUP BY group_order_id
) go_totals ON go_totals.group_order_id = go.id
GROUP BY go.restaurant_id;

-- ─── 4. Per-order summary view ───────────────────────────────
-- Useful for listing group orders in admin with payment stats.

CREATE OR REPLACE VIEW public.group_orders_list AS
SELECT
  go.id,
  go.restaurant_id,
  go.title,
  go.host_name,
  go.host_phone,
  go.status,
  go.payment_mode,
  go.share_token,
  go.expires_at,
  go.created_at,
  go.submitted_at,
  go.final_order_id,
  COUNT(DISTINCT gop.id)                                             AS participant_count,
  COUNT(DISTINCT goi.id)                                             AS item_count,
  COALESCE(SUM(gop.subtotal), 0)                                     AS grand_total,
  COUNT(gop.id) FILTER (WHERE gop.payment_status = 'paid')           AS paid_count,
  COUNT(gop.id) FILTER (WHERE gop.payment_method = 'cash')           AS cash_count,
  COUNT(gop.id) FILTER (WHERE gop.payment_status = 'unpaid' AND gop.payment_method != 'cash')
                                                                     AS unpaid_count,
  COALESCE(SUM(gop.subtotal) FILTER (WHERE gop.payment_status = 'paid'), 0)
                                                                     AS paid_total,
  COALESCE(SUM(gop.subtotal) FILTER (WHERE gop.payment_status = 'unpaid'), 0)
                                                                     AS unpaid_total
FROM public.group_orders go
LEFT JOIN public.group_order_participants gop ON gop.group_order_id = go.id
LEFT JOIN public.group_order_items goi ON goi.group_order_id = go.id
GROUP BY go.id
ORDER BY go.created_at DESC;
