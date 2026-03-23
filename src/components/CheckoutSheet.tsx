import { useCartStore } from '@/store/cartStore';
import { supabase } from "@/integrations/supabase/client";
import { createOrder } from "@/lib/createOrder";
import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMenu } from "@/hooks/useMenu";

const DEFAULT_WHATSAPP_PHONE = "972526204159";
const DEFAULT_DELIVERY_FEE = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type RestaurantSettings = {
  whatsapp_phone: string;
  delivery_fee: number;
  min_order_amount: number;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  accepts_dine_in: boolean;
  is_open: boolean;
  online_payment_enabled: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPrice(value: number): string { return `₪${value}`; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemResolvedName(item: any): string {
  return item?.menuItem?.name_he || item?.menuItem?.name || item?.name || "פריט";
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemResolvedBasePrice(item: any): number {
  return Number(item?.menuItem?.price ?? item?.price ?? 0);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemOptions(item: any) {
  if (Array.isArray(item?.selectedOptions)) return item.selectedOptions;
  if (Array.isArray(item?.options)) return item.options;
  return [];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getItemTotal(item: any): number {
  const basePrice = getItemResolvedBasePrice(item);
  const options = getItemOptions(item);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extra = options.reduce((sum: number, opt: any) => sum + Number(opt?.priceDelta ?? opt?.price ?? 0), 0);
  return (basePrice + extra) * Number(item?.quantity || 1);
}

function buildWhatsappMessage(params: {
  restaurantName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customerDetails: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  arrivalTime: string;
}): string {
  const { restaurantName, customerDetails, items, subtotal, deliveryFee, total, arrivalTime } = params;
  const lines: string[] = [];
  lines.push(`🍽️ הזמנה חדשה — ${restaurantName}`);
  lines.push("");
  lines.push(`שם מלא: ${customerDetails.name}`);
  lines.push(`טלפון: ${customerDetails.phone}`);
  const orderTypeText = customerDetails.orderType === "pickup" ? "איסוף עצמי" :
    customerDetails.orderType === "delivery" ? "משלוח" : "ישיבה במקום";
  lines.push(`סוג הזמנה: ${orderTypeText}`);
  if (customerDetails.orderType === "delivery" && customerDetails.address?.trim())
    lines.push(`כתובת: ${customerDetails.address.trim()}`);
  if (arrivalTime && customerDetails.orderType !== "delivery") {
    const arrivalText = arrivalTime === "now" ? "בדרך מגיע" :
      arrivalTime === "20min" ? "מגיע בעוד 20 דקות" : "מגיע בעוד 40 דקות";
    lines.push(`זמן הגעה: ${arrivalText}`);
  }
  lines.push(""); lines.push("פריטים:");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items.forEach((item: any) => {
    const itemName = getItemResolvedName(item);
    const options = getItemOptions(item);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionsText = options.length > 0 ? ` (${options.map((opt: any) => opt?.name || opt?.optionValueName || "בחירה").join(", ")})` : "";
    lines.push(`• ${itemName}${optionsText}, ${item.quantity}x — ${formatPrice(getItemTotal(item))}`);
    if (item?.notes?.trim()) lines.push(`  הערות: ${item.notes.trim()}`);
  });
  lines.push("");
  lines.push(`סכום ביניים: ${formatPrice(subtotal)}`);
  if (deliveryFee > 0) lines.push(`משלוח: ${formatPrice(deliveryFee)}`);
  lines.push(`סה"כ: ${formatPrice(total)}`);
  if (customerDetails.notes?.trim()) { lines.push(""); lines.push(`הערות: ${customerDetails.notes.trim()}`); }
  return lines.join("\n");
}

export default function CheckoutSheet() {
  const { items, isCheckoutOpen, setCheckoutOpen, customerDetails, setCustomerDetails, setOrderType, clearCart } = useCartStore();
  const { restaurantId } = useMenu();

  const safeItems = Array.isArray(items) ? items : [];
  const [submitting, setSubmitting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<"now" | "20min" | "40min" | "">("");
  const [settings, setSettings] = useState<RestaurantSettings>({
    whatsapp_phone: DEFAULT_WHATSAPP_PHONE,
    delivery_fee: DEFAULT_DELIVERY_FEE,
    min_order_amount: 0,
    accepts_delivery: true,
    accepts_pickup: true,
    accepts_dine_in: true,
    is_open: true,
    online_payment_enabled: false,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const fetchSettings = async () => {
      const { data } = await db.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).maybeSingle();
      if (data) {
        setSettings({
          whatsapp_phone: data.whatsapp ?? data.whatsapp_number ?? DEFAULT_WHATSAPP_PHONE,
          delivery_fee: Number(data.delivery_fee ?? DEFAULT_DELIVERY_FEE),
          min_order_amount: Number(data.min_order_amount ?? data.minimum_order ?? 0),
          accepts_delivery: data.delivery_enabled ?? data.is_delivery ?? true,
          accepts_pickup: data.pickup_enabled ?? data.is_pickup ?? true,
          accepts_dine_in: data.dine_in_enabled ?? data.is_dinein ?? true,
          is_open: data.is_accepting_orders ?? true,
          online_payment_enabled: data.online_payment_enabled ?? false,
        });
      }
    };
    fetchSettings();
  }, [restaurantId]);

  const subtotal = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => safeItems.reduce((sum, item: any) => sum + (item.lineTotal || getItemTotal(item)), 0),
    [safeItems]
  );

  const fee = customerDetails.orderType === "delivery" ? settings.delivery_fee : 0;
  const total = subtotal + fee;
  const belowMinimum = settings.min_order_amount > 0 && subtotal < settings.min_order_amount;

  const validate = () => {
    if (safeItems.length === 0) throw new Error("העגלה ריקה");
    if (!settings.is_open) throw new Error("המסעדה סגורה כרגע");
    if (belowMinimum) throw new Error(`מינימום הזמנה הוא ${formatPrice(settings.min_order_amount)}`);
    if (!customerDetails.name.trim() || customerDetails.name.trim().length < 2) throw new Error("יש להזין שם תקין");
    if (!customerDetails.phone.trim() || customerDetails.phone.replace(/[^\d+]/g, "").length < 7) throw new Error("יש להזין טלפון תקין");
    if (customerDetails.orderType === "delivery" && !customerDetails.address?.trim()) throw new Error("יש להזין כתובת למשלוח");
  };

  const getRestaurant = async () => {
    const { data: restaurant, error } = await db.from("restaurants").select("id, slug, name").eq("id", restaurantId).maybeSingle();
    if (error) throw error;
    if (!restaurant) throw new Error("המסעדה לא נמצאה");
    return restaurant;
  };

  const resetForm = () => {
    clearCart();
    setCheckoutOpen(false);
    setArrivalTime("");
    setCustomerDetails({ name: "", phone: "", address: "", notes: "" });
  };

  const handleSend = async () => {
    try {
      setSubmitting(true);
      validate();
      const restaurant = await getRestaurant();
      await createOrder({ restaurantId: restaurant.id, items: safeItems, customerDetails, subtotal, deliveryFee: fee, total });
      const whatsappMessage = buildWhatsappMessage({ restaurantName: restaurant.name, customerDetails, items: safeItems, subtotal, deliveryFee: fee, total, arrivalTime });
      const encoded = encodeURIComponent(whatsappMessage);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const url = isMobile ? `https://wa.me/${settings.whatsapp_phone}?text=${encoded}` : `https://web.whatsapp.com/send?phone=${settings.whatsapp_phone}&text=${encoded}`;
      window.open(url, "_blank");
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : "שגיאה בשמירת ההזמנה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOnlinePayment = async () => {
    try {
      setPaymentLoading(true);
      validate();
      const restaurant = await getRestaurant();
      const order = await createOrder({ restaurantId: restaurant.id, items: safeItems, customerDetails, subtotal, deliveryFee: fee, total });
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment', {
        body: {
          order_id: order.id,
          restaurant_id: restaurant.id,
          amount: total,
          success_url: `${window.location.origin}/payment/success`,
          failure_url: `${window.location.origin}/payment/failure`,
        },
      });
      if (sessionError) throw sessionError;
      if (!sessionData?.payment_url) throw new Error("לא התקבל קישור לתשלום");
      window.location.href = sessionData.payment_url;
    } catch (error) {
      alert(error instanceof Error ? error.message : "שגיאה ביצירת תשלום");
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <Sheet open={isCheckoutOpen} onOpenChange={setCheckoutOpen}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-right">השלם את ההזמנה</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6" dir="rtl">
          {!settings.is_open && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-destructive">🔴 המסעדה סגורה כרגע</p>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium">סוג הזמנה</label>
            <div className="grid grid-cols-3 gap-2">
              {settings.accepts_dine_in && <Button type="button" variant={customerDetails.orderType === "eat-in" ? "default" : "outline"} onClick={() => setOrderType("eat-in")}>ישיבה במקום</Button>}
              {settings.accepts_delivery && <Button type="button" variant={customerDetails.orderType === "delivery" ? "default" : "outline"} onClick={() => setOrderType("delivery")}>משלוח</Button>}
              {settings.accepts_pickup && <Button type="button" variant={customerDetails.orderType === "pickup" ? "default" : "outline"} onClick={() => setOrderType("pickup")}>איסוף עצמי</Button>}
            </div>
          </div>

          {customerDetails.orderType !== "delivery" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">מתי תגיע?</label>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant={arrivalTime === "now" ? "default" : "outline"} onClick={() => setArrivalTime("now")}>בדרך מגיע</Button>
                <Button type="button" variant={arrivalTime === "20min" ? "default" : "outline"} onClick={() => setArrivalTime("20min")}>בעוד 20 דק׳</Button>
                <Button type="button" variant={arrivalTime === "40min" ? "default" : "outline"} onClick={() => setArrivalTime("40min")}>בעוד 40 דק׳</Button>
              </div>
              <p className="text-xs text-muted-foreground text-right">⏱ זמן משוער להכנה: כ-15 דקות</p>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium">שם מלא</label>
            <Input value={customerDetails.name} onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value.replace(/[^A-Za-z\u0590-\u05FF\u0600-\u06FF\s-]/g, "") })} placeholder="הכנס שם מלא" />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium">טלפון</label>
            <Input value={customerDetails.phone} onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value.replace(/\D/g, "") })} placeholder="הכנס מספר טלפון" inputMode="tel" maxLength={10} />
          </div>

          {customerDetails.orderType === "delivery" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">כתובת</label>
              <Input value={customerDetails.address} onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })} placeholder="הכנס כתובת למשלוח" />
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium">הערות</label>
            <Textarea value={customerDetails.notes} onChange={(e) => setCustomerDetails({ ...customerDetails, notes: e.target.value })} placeholder="הערות נוספות להזמנה" rows={3} />
          </div>

          <div className="rounded-2xl border p-4 space-y-2">
            <div className="flex items-center justify-between"><span>סכום ביניים</span><span>{formatPrice(subtotal)}</span></div>
            {customerDetails.orderType === "delivery" && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>דמי משלוח</span><span>{formatPrice(settings.delivery_fee)}</span>
              </div>
            )}
            {settings.min_order_amount > 0 && belowMinimum && (
              <p className="text-xs text-destructive">מינימום הזמנה: {formatPrice(settings.min_order_amount)}</p>
            )}
            <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
              <span>סה"כ</span><span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button type="button" className="w-full" onClick={handleSend} disabled={submitting || safeItems.length === 0 || !settings.is_open || belowMinimum}>
              {submitting ? "שולח..." : `📲 שלח הזמנה בוואטסאפ — ${formatPrice(total)}`}
            </Button>

            <div className="relative">
              <Button
                type="button"
                variant="outline"
                className={`w-full border-2 transition-all ${settings.online_payment_enabled ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground" : "border-border bg-muted/40 text-foreground/70 cursor-not-allowed"}`}
                onClick={settings.online_payment_enabled ? handleOnlinePayment : undefined}
                disabled={paymentLoading || !settings.online_payment_enabled || safeItems.length === 0 || !settings.is_open || belowMinimum}
              >
                {paymentLoading ? "מעבד..." : `💳 שלם אונליין — ${formatPrice(total)}`}
              </Button>
              {!settings.online_payment_enabled && (
                <>
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">בקרוב</span>
                  <div className="text-center space-y-1.5 mt-2">
                    <div className="flex items-center justify-center gap-2">
                      {["אשראי", "Bit", "Apple Pay", "Google Pay"].map(method => (
                        <span key={method} className="text-[11px] text-muted-foreground border border-border/60 rounded-md px-2 py-0.5 bg-muted/30">{method}</span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">💳 תשלום בכרטיס / Bit בקרוב</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}