import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, User, Phone, MessageSquare, Truck, Store, UtensilsCrossed, Clock } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { generateWhatsAppLink } from '@/lib/whatsapp';
import { useI18n } from '@/i18n/context';
import type { OrderType } from '@/types/menu';

const PREP_OPTIONS = [
  { id: 'now', label: 'התחילו להכין' },
  { id: '20min', label: 'מוכן בעוד 20 דקות' },
  { id: '30min', label: 'מוכן בעוד 30 דקות' },
];

const CheckoutSheet = () => {
  const { t } = useI18n();
  const {
    items, isCheckoutOpen, setCheckoutOpen, customerDetails, setCustomerDetails,
    setOrderType, getSubtotal, getTotal, deliveryFee, prepTime, setPrepTime,
  } = useCartStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = getSubtotal();
  const total = getTotal();
  const showDelivery = customerDetails.orderType === 'delivery';

  const orderTypes: { type: OrderType; label: string; icon: React.ElementType }[] = [
    { type: 'pickup', label: t.checkout.pickup, icon: Store },
    { type: 'delivery', label: t.checkout.delivery, icon: Truck },
    { type: 'eat-in', label: t.checkout.eat_in, icon: UtensilsCrossed },
  ];

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^0-9+\-\s]/g, '');
    setCustomerDetails({ phone: cleaned });
    setErrors((p) => ({ ...p, phone: '' }));
  };

  const handleNameChange = (value: string) => {
    const cleaned = value.replace(/[0-9]/g, '');
    setCustomerDetails({ name: cleaned });
    setErrors((p) => ({ ...p, name: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};

    const name = customerDetails.name.trim();
    if (!name) {
      e.name = t.lang === 'he' ? 'שם הוא שדה חובה' : t.lang === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    } else if (name.length < 2) {
      e.name = t.lang === 'he' ? 'השם קצר מדי' : t.lang === 'ar' ? 'الاسم قصير جداً' : 'Name is too short';
    }

    const phone = customerDetails.phone.trim();
    if (!phone) {
      e.phone = t.lang === 'he' ? 'טלפון הוא שדה חובה' : t.lang === 'ar' ? 'الهاتف مطلوب' : 'Phone is required';
    } else if (phone.replace(/[\s\-+]/g, '').length < 7) {
      e.phone = t.lang === 'he' ? 'מספר טלפון לא תקין' : t.lang === 'ar' ? 'رقم هاتف غير صالح' : 'Enter a valid phone number';
    }

    if (showDelivery && !customerDetails.address.trim()) {
      e.address = t.lang === 'he' ? 'כתובת היא שדה חובה' : t.lang === 'ar' ? 'العنوان مطلوب' : 'Address is required';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = () => {
    if (!validate()) return;
    const link = generateWhatsAppLink(items, customerDetails, subtotal, deliveryFee, total, t, prepTime);
    window.open(link, '_blank');
  };

  return (
    <AnimatePresence>
      {isCheckoutOpen && (
        <>
          <motion.div
            key="checkout-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setCheckoutOpen(false)}
          />
          <motion.div
            key="checkout-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[90vh] flex flex-col md:max-w-lg md:mx-auto overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="font-display text-lg text-foreground">{t.checkout.title}</h2>
              <button onClick={() => setCheckoutOpen(false)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 min-w-0">
              {/* Order Type */}
              <div className="mb-5">
                <label className="font-bold text-sm text-foreground block mb-2">{t.checkout.order_type}</label>
                <div className="grid grid-cols-3 gap-2">
                  {orderTypes.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all active:scale-[0.98] ${
                        customerDetails.orderType === type
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preparation Time */}
              <div className="mb-5">
                <label className="font-bold text-sm text-foreground flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  זמן הכנה
                </label>
                <div className="flex flex-col gap-2">
                  {PREP_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPrepTime(prepTime === opt.id ? '' : opt.id)}
                      className={`h-11 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                        prepTime === opt.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <div className={`flex items-center gap-3 h-12 px-4 rounded-xl bg-secondary min-w-0 ${errors.name ? 'ring-2 ring-destructive' : ''}`}>
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                      value={customerDetails.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder={t.checkout.name_placeholder}
                      maxLength={100}
                      autoComplete="name"
                      className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  {errors.name && <p className="text-destructive text-xs mt-1 ps-4">{errors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <div className={`flex items-center gap-3 h-12 px-4 rounded-xl bg-secondary min-w-0 ${errors.phone ? 'ring-2 ring-destructive' : ''}`}>
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                      value={customerDetails.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={t.checkout.phone_placeholder}
                      type="tel"
                      inputMode="tel"
                      maxLength={20}
                      autoComplete="tel"
                      className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  {errors.phone && <p className="text-destructive text-xs mt-1 ps-4">{errors.phone}</p>}
                </div>

                {/* Address (delivery only) */}
                {showDelivery && (
                  <div>
                    <div className={`flex items-center gap-3 h-12 px-4 rounded-xl bg-secondary min-w-0 ${errors.address ? 'ring-2 ring-destructive' : ''}`}>
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <input
                        value={customerDetails.address}
                        onChange={(e) => { setCustomerDetails({ address: e.target.value }); setErrors((p) => ({ ...p, address: '' })); }}
                        placeholder={t.checkout.address_placeholder}
                        maxLength={200}
                        autoComplete="street-address"
                        className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </div>
                    {errors.address && <p className="text-destructive text-xs mt-1 ps-4">{errors.address}</p>}
                  </div>
                )}

                {/* Notes */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary min-w-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <textarea
                    value={customerDetails.notes}
                    onChange={(e) => setCustomerDetails({ notes: e.target.value })}
                    placeholder={t.checkout.notes_placeholder}
                    maxLength={500}
                    className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none h-16"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.cart.subtotal}</span>
                  <span className="text-foreground font-semibold">₪{subtotal}</span>
                </div>
                {showDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.checkout.delivery_fee}</span>
                    <span className="text-foreground font-semibold">₪{deliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-base border-t border-border pt-2">
                  <span className="font-bold text-foreground">{t.checkout.total}</span>
                  <span className="font-display text-primary text-lg">₪{total}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card safe-bottom">
              <button
                onClick={handleSend}
                className="w-full h-14 rounded-full bg-[#25D366] text-primary-foreground font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {t.checkout.send_whatsapp} — ₪{total}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CheckoutSheet;
