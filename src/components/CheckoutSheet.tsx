import { useCartStore } from '@/store/cartStore';
import { supabase } from "@/integrations/supabase/client";
import { createOrder } from "@/lib/createOrder";
import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMenu } from "@/hooks/useMenu";
import { useOpeningHours } from "@/hooks/useOpeningHours";

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
  online_payment_enabled: boolean;
};

type DeliveryZone = {
  id: string;
  zone_name: string;
  delivery_fee: number;
  min_order: number;
  active: boolean;
  cities: string[];
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

function findZoneByCity(city: string, zones: DeliveryZone[]): DeliveryZone | null {
  if (!city) return null;
  return zones.find(z => z.active && Array.isArray(z.cities) && z.cities.includes(city)) ?? null;
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
  selectedCity?: string;
  zoneName?: string;
}): string {
  const { restaurantName, customerDetails, items, subtotal, deliveryFee, total, arrivalTime, selectedCity, zoneName } = params;
  const lines: string[] = [];
  lines.push(`🍽️ הזמנה חדשה — ${restaurantName}`);
  lines.push("");
  lines.push(`שם מלא: ${customerDetails.name}`);
  lines.push(`טלפון: ${customerDetails.phone}`);
  const orderTypeText = customerDetails.orderType === "pickup" ? "איסוף עצמי" :
    customerDetails.orderType === "delivery" ? "משלוח" : "ישיבה במקום";
  lines.push(`סוג הזמנה: ${orderTypeText}`);
  if (customerDetails.orderType === "delivery") {
    if (selectedCity) lines.push(`עיר: ${selectedCity}`);
    if (customerDetails.address?.trim()) lines.push(`כתובת: ${customerDetails.address.trim()}`);
    if (zoneName) lines.push(`אזור משלוח: ${zoneName}`);
  }
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
  const { isOpen } = useOpeningHours(restaurantId);

  const safeItems = Array.isArray(items) ? items : [];
  const [submitting, setSubmitting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<"now" | "20min" | "40min" | "">("");
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [sharedLocation, setSharedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [settings, setSettings] = useState<RestaurantSettings>({
    whatsapp_phone: DEFAULT_WHATSAPP_PHONE,
    delivery_fee: DEFAULT_DELIVERY_FEE,
    min_order_amount: 0,
    accepts_delivery: true,
    accepts_pickup: true,
    accepts_dine_in: true,
    online_payment_enabled: false,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const fetchAll = async () => {
      const [settingsRes, zonesRes] = await Promise.all([
        db.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).maybeSingle(),
        db.from('delivery_zones').select('*').eq('restaurant_id', restaurantId),
      ]);
      if (settingsRes.data) {
        const s = settingsRes.data;
        setSettings({
          whatsapp_phone: s.whatsapp_number ?? DEFAULT_WHATSAPP_PHONE,
          delivery_fee: Number(s.delivery_fee ?? DEFAULT_DELIVERY_FEE),
          min_order_amount: Number(s.minimum_order ?? s.min_order_amount ?? 0),
          accepts_delivery: s.is_delivery_enabled ?? true,
          accepts_pickup: s.is_pickup_enabled ?? true,
          accepts_dine_in: s.is_dine_in_enabled ?? true,
          online_payment_enabled: s.online_payment_enabled ?? false,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDeliveryZones((zonesRes.data ?? []).map((z: any) => ({
        ...z,
        active: z.active === true,
        cities: Array.isArray(z.cities) ? z.cities : [],
      })));
    };
    fetchAll();
  }, [restaurantId]);

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    deliveryZones.filter(z => z.active).forEach(z => {
      z.cities.forEach(c => cities.add(c));
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b, 'he'));
  }, [deliveryZones]);

  const detectedZone = useMemo(() => {
    return findZoneByCity(selectedCity, deliveryZones);
  }, [selectedCity, deliveryZones]);

  const subtotal = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => safeItems.reduce((sum, item: any) => sum + (item.lineTotal || getItemTotal(item)), 0),
    [safeItems]
  );

  const fee = useMemo(() => {
    if (customerDetails.orderType !== "delivery") return 0;
    if (detectedZone) return detectedZone.delivery_fee;
    return settings.delivery_fee;
  }, [customerDetails.orderType, detectedZone, settings.delivery_fee]);

  const total = subtotal + fee;
  const minOrder = detectedZone?.min_order || settings.min_order_amount;
  const belowMinimum = minOrder > 0 && subtotal < minOrder;
  const restaurantClosed = isOpen === false;

  const validate = () => {
    if (safeItems.length === 0) throw new Error("העגלה ריקה");
    if (restaurantClosed) throw new Error("המסעדה סגורה כרגע");
    if (belowMinimum) throw new Error(`מינימום הזמנה הוא ${formatPrice(minOrder)}`);
    if (!customerDetails.name.trim() || customerDetails.name.trim().length < 2) throw new Error("יש להזין שם תקין");
    if (!customerDetails.phone.trim() || customerDetails.phone.replace(/[^\d+]/g, "").length < 7) throw new Error("יש להזין טלפון תקין");
    if (customerDetails.orderType === "delivery" && !selectedCity) throw new Error("יש לבחור עיר למשלוח");
  };

  const getRestaurant = async () => {
    const { data: restaurant, error } = await db.from("restaurants").select("id, slug, name").eq("id", restaurantId).maybeSingle();
    if (error) throw error;
    if (!restaurant) throw new Error("המסעדה לא נמצאה");
    return restaurant;
  };

  const shareLocation = () => {
    if (!navigator.geolocation) { alert('הדפדפן שלך לא תומך בשיתוף מיקום'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setSharedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { alert('לא הצלחנו לקבל את המיקום שלך. אנא הזן כתובת ידנית.'); setLocating(false); },
      { timeout: 10000 }
    );
  };

  const resetForm = () => {
    clearCart();
    setCheckoutOpen(false);
    setArrivalTime("");
    setSelectedCity('');
    setSharedLocation(null);
    setCustomerDetails({ name: "", phone: "", address: "", notes: "" });
  };

  const handleSend = async () => {
    // ─── DEBUG ───────────────────────────────────────────────────────────────
    console.log('🚀 handleSend START');
    console.log('🚀 orderType:', customerDetails.orderType);
    console.log('🚀 items count:', safeItems.length);
    console.log('🚀 first item:', JSON.stringify(safeItems[0]));
    // ─────────────────────────────────────────────────────────────────────────
    try {
      setSubmitting(true);
      validate();
      console.log('🚀 validate passed');
      const restaurant = await getRestaurant();
      const detailsWithCity = {
        ...customerDetails,
        address: selectedCity + (customerDetails.address ? ` — ${customerDetails.address}` : ''),
      };
      console.log('🚀 calling createOrder...');
      await createOrder({
        restaurantId: restaurant.id,
        items: safeItems,
        customerDetails: detailsWithCity,
        subtotal,
        deliveryFee: fee,
        total,
        latitude: sharedLocation?.lat,
        longitude: sharedLocation?.lng,
      });
      console.log('🚀 createOrder done');
      const whatsappMessage = buildWhatsappMessage({
        restaurantName: restaurant.name,
        customerDetails,
        items: safeItems,
        subtotal, deliveryFee: fee, total, arrivalTime,
        selectedCity,
        zoneName: detectedZone?.zone_name,
      });
      const encoded = encodeURIComponent(whatsappMessage);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const url = isMobile ? `https://wa.me/${settings.whatsapp_phone}?text=${encoded}` : `https://web.whatsapp.com/send?phone=${settings.whatsapp_phone}&text=${encoded}`;
      window.open(url, "_blank");
      resetForm();
    } catch (error) {
      console.error('🚀 handleSend error:', error);
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
      const detailsWithCity = {
        ...customerDetails,
        address: selectedCity + (customerDetails.address ? ` — ${customerDetails.address}` : ''),
      };
      const order = await createOrder({ restaurantId: restaurant.id, items: safeItems, customerDetails: detailsWithCity, subtotal, deliveryFee: fee, total });
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-payment', {
        body: { order_id: order.id, restaurant_id: restaurant.id, amount: total, success_url: `${window.location.origin}/payment/success`, failure_url: `${window.location.origin}/payment/failure` },
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
          {restaurantClosed && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 text-center">
              <p className="text-sm font-semibold text-destructive">🔴 המסעדה סגורה כרגע — לא ניתן לבצע הזמנה</p>
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

          {customerDetails.orderType === "delivery" && (
            <div className="space-y-3">
              {availableCities.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">עיר / ישוב *</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger><SelectValue placeholder="בחר עיר..." /></SelectTrigger>
                    <SelectContent>
                      {availableCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedCity && detectedZone && (
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-200 rounded-lg px-3 py-2">
                      <span className="text-xs text-green-700">
                        📍 {detectedZone.zone_name} · משלוח: {detectedZone.delivery_fee === 0 ? 'חינם' : `₪${detectedZone.delivery_fee}`}
                        {detectedZone.min_order > 0 && ` · מינימום: ₪${detectedZone.min_order}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-sm font-medium">
                  {availableCities.length > 0 ? 'רחוב ומספר בית' : 'כתובת מלאה'}
                </label>
                {sharedLocation ? (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-200 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-green-700 flex-1">✅ מיקום שותף בהצלחה</span>
                    <button onClick={() => setSharedLocation(null)} className="text-xs text-muted-foreground underline">הזן כתובת במקום</button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-start">
                    <Input value={customerDetails.address} onChange={e => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                      placeholder={availableCities.length > 0 ? "רחוב הגפן 5" : "עיר, רחוב ומספר בית"} className="flex-1" />
                    <button onClick={shareLocation} disabled={locating} title="שתף מיקום"
                      className="shrink-0 w-11 h-10 rounded-xl bg-[#05C8F7]/10 border border-[#05C8F7]/30 flex items-center justify-center hover:bg-[#05C8F7]/20 transition-colors disabled:opacity-50">
                      {locating ? (
                        <svg className="w-5 h-5 animate-spin text-[#05C8F7]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 64 64" className="w-6 h-6" fill="none">
                          <circle cx="32" cy="32" r="32" fill="#05C8F7"/>
                          <path d="M32 10C21 10 12 19 12 30c0 8 5 15 12 18l8 6 8-6c7-3 12-10 12-18 0-11-9-20-20-20z" fill="white"/>
                          <circle cx="32" cy="30" r="8" fill="#05C8F7"/>
                          <circle cx="26" cy="38" r="3" fill="#333"/>
                          <circle cx="38" cy="38" r="3" fill="#333"/>
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">💡 הזן כתובת ידנית או לחץ על האייקון לשיתוף מיקום מדויק</p>
              </div>
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

          <div className="space-y-3">
            <label className="block text-sm font-medium">הערות</label>
            <Textarea value={customerDetails.notes} onChange={(e) => setCustomerDetails({ ...customerDetails, notes: e.target.value })} placeholder="הערות נוספות להזמנה" rows={3} />
          </div>

          <div className="rounded-2xl border p-4 space-y-2">
            <div className="flex items-center justify-between"><span>סכום ביניים</span><span>{formatPrice(subtotal)}</span></div>
            {customerDetails.orderType === "delivery" && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>דמי משלוח{detectedZone && <span className="text-xs mr-1">({detectedZone.zone_name})</span>}</span>
                <span>{fee === 0 ? 'חינם' : formatPrice(fee)}</span>
              </div>
            )}
            {minOrder > 0 && belowMinimum && <p className="text-xs text-destructive">מינימום הזמנה: {formatPrice(minOrder)}</p>}
            <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
              <span>סה"כ</span><span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button type="button" className="w-full" onClick={handleSend} disabled={submitting || safeItems.length === 0 || restaurantClosed || belowMinimum}>
              {submitting ? "שולח..." : `📲 שלח הזמנה בוואטסאפ — ${formatPrice(total)}`}
            </Button>

            <div className="relative">
              <Button type="button" variant="outline"
                className={`w-full border-2 transition-all ${settings.online_payment_enabled ? "border-primary text-primary hover:bg-primary hover:text-primary-foreground" : "border-border bg-muted/40 text-foreground/70 cursor-not-allowed"}`}
                onClick={settings.online_payment_enabled ? handleOnlinePayment : undefined}
                disabled={paymentLoading || !settings.online_payment_enabled || safeItems.length === 0 || restaurantClosed || belowMinimum}>
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