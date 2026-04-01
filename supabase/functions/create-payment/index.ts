import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// PayPlus API endpoint for creating a payment page
const PAYPLUS_API_URL = "https://restapi.payplus.co.il/api/v1.0/PaymentPages/generateLink";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, restaurant_id, amount, success_url, failure_url } =
      await req.json();

    if (!order_id || !restaurant_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_id, restaurant_id, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── 1. Read PayPlus credentials from restaurant_settings ──
    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("payplus_api_key, payplus_secret_key")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Restaurant settings not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = settings.payplus_api_key ?? Deno.env.get("PAYPLUS_API_KEY");
    const secretKey = settings.payplus_secret_key ?? Deno.env.get("PAYPLUS_SECRET_KEY");

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ error: "PayPlus credentials not configured for this restaurant" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Read order details for customer info ────────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, total")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3. Create payment record (pending) ────────────────────
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        order_id,
        restaurant_id,
        provider: "payplus",
        amount,
        status: "pending",
        success_url: success_url ?? null,
        failure_url: failure_url ?? null,
      })
      .select("id")
      .single();

    if (insertError || !payment) {
      return new Response(
        JSON.stringify({ error: "Failed to create payment record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 4. Call PayPlus API to generate payment page ──────────
    // PayPlus generateLink API:
    // https://docs.payplus.co.il/api/generateLink
    const payplusPayload = {
      payment_page_uid: "",           // blank = new page
      charge_method: 1,               // 1 = regular charge
      sendEmailApproval: false,
      sendEmailFailure: false,
      refURL_success: success_url ?? "",
      refURL_failure: failure_url ?? "",
      refURL_callback: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      create_token: false,
      order: {
        number: order_id,             // our order_id as reference
        description: `הזמנה #${order_id.slice(0, 8)}`,
        currency_code: "ILS",
        amount: String(amount),
      },
      customer: {
        customer_name:  order.customer_name  ?? "",
        phone:          order.customer_phone ?? "",
        email:          "",
        social_id:      "",
        payment_token:  "",
      },
      items: [
        {
          name:     `הזמנה #${order_id.slice(0, 8)}`,
          quantity: "1",
          price:    String(amount),
          barcode:  "",
          is_exempt_vat: false,
        },
      ],
    };

    const payplusRes = await fetch(PAYPLUS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": JSON.stringify({ api_key: apiKey, secret_key: secretKey }),
      },
      body: JSON.stringify(payplusPayload),
    });

    if (!payplusRes.ok) {
      const errText = await payplusRes.text();
      console.error("[create-payment] PayPlus error:", payplusRes.status, errText);
      // Mark payment as failed
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      return new Response(
        JSON.stringify({ error: "PayPlus API error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payplusData = await payplusRes.json();

    // PayPlus returns: { payment_page_uid, payment_page_link, ... }
    const paymentUrl = payplusData?.data?.payment_page_link ?? payplusData?.payment_page_link;
    const pageId     = payplusData?.data?.payment_page_uid   ?? payplusData?.payment_page_uid;

    if (!paymentUrl) {
      console.error("[create-payment] No payment_page_link in PayPlus response:", payplusData);
      await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return new Response(
        JSON.stringify({ error: "PayPlus did not return a payment URL" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 5. Store URL + page ID on the payment record ──────────
    await supabase
      .from("payments")
      .update({ payment_url: paymentUrl, provider_page_id: pageId ?? null })
      .eq("id", payment.id);

    // ── 6. Return payment_url to frontend ─────────────────────
    return new Response(
      JSON.stringify({ payment_url: paymentUrl, payment_id: payment.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("[create-payment] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});