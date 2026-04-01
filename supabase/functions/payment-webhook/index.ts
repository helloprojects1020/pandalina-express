// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Webhook from PayPlus — no CORS needed (server-to-server)
// PayPlus sends a POST with JSON body containing transaction result.
// Docs: https://docs.payplus.co.il/api/webhook

serve(async (req) => {
  try {
    const body = await req.json();

    console.log("[payment-webhook] received:", JSON.stringify(body));

    // ── PayPlus webhook payload fields ────────────────────────
    // transaction.status:       "approved" | "declined" | "pending"
    // transaction.uid:          PayPlus transaction UID
    // payment_page.uid:         PayPlus page UID (matches provider_page_id)
    // order.number:             our order_id (we set this in create-payment)
    // transaction.amount:       charged amount

    const status         = body?.transaction?.status;           // "approved" | "declined"
    const txUid          = body?.transaction?.uid    ?? null;   // PayPlus tx ID
    const pageUid        = body?.payment_page?.uid   ?? null;   // PayPlus page ID
    const orderRef       = body?.order?.number       ?? null;   // our order_id UUID

    if (!orderRef) {
      console.error("[payment-webhook] no order.number in payload");
      // Return 200 so PayPlus doesn't keep retrying a permanently bad payload
      return new Response(JSON.stringify({ ok: false, error: "no order reference" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isPaid   = status === "approved";
    const isFailed = status === "declined" || status === "failed";

    const newPaymentStatus = isPaid ? "paid" : isFailed ? "failed" : "pending";
    const newOrderStatus   = isPaid ? "paid" : isFailed ? "failed" : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── 1. Find the payment record ────────────────────────────
    // Look up by order_id (our reference) + provider_page_id
    // Try order_id first; fall back to page UID if needed.
    let paymentQuery = supabase
      .from("payments")
      .select("id, restaurant_id")
      .eq("order_id", orderRef)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pageUid) {
      paymentQuery = supabase
        .from("payments")
        .select("id, restaurant_id")
        .eq("provider_page_id", pageUid)
        .maybeSingle();
    }

    const { data: payment, error: paymentError } = await paymentQuery;

    if (paymentError || !payment) {
      console.error("[payment-webhook] payment record not found for order:", orderRef, pageUid);
      return new Response(JSON.stringify({ ok: false, error: "payment not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 2. Update payments table ──────────────────────────────
    const paymentUpdate: Record<string, unknown> = {
      status:               newPaymentStatus,
      provider_payment_id:  txUid,
      raw_webhook:          body,
    };
    if (isPaid) {
      paymentUpdate.paid_at = new Date().toISOString();
    }

    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update(paymentUpdate)
      .eq("id", payment.id);

    if (updatePaymentError) {
      console.error("[payment-webhook] failed to update payment:", updatePaymentError);
    }

    // ── 3. Update orders.payment_status ──────────────────────
    if (newOrderStatus) {
      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ payment_status: newOrderStatus })
        .eq("id", orderRef);

      if (updateOrderError) {
        console.error("[payment-webhook] failed to update order:", updateOrderError);
      }
    }

    console.log("[payment-webhook] processed:", orderRef, "→", newPaymentStatus);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[payment-webhook] unexpected error:", err);
    // Still return 200 — a 500 would cause PayPlus to retry endlessly
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});