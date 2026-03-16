import { useEffect, useRef, useState, useCallback } from 'react';
import type { ElementType, KeyboardEvent } from 'react';
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

type FocusableField = HTMLInputElement | HTMLTextAreaElement;

const CheckoutSheet = () => {
  const { t } = useI18n();
  const {
    items, isCheckoutOpen, setCheckoutOpen, customerDetails, setCustomerDetails,
    setOrderType, getSubtotal, getTotal, deliveryFee, prepTime, setPrepTime,
  } = useCartStore();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const contentRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  const subtotal = getSubtotal();
  const total = getTotal();
  const showDelivery = customerDetails.orderType === 'delivery';

  const orderTypes: { type: OrderType; label: string; icon: ElementType }[] = [
    { type: 'pickup', label: t.checkout.pickup, icon: Store },
    { type: 'delivery', label: t.checkout.delivery, icon: Truck },
    { type: 'eat-in', label: t.checkout.eat_in, icon: UtensilsCrossed },
  ];

  // Lock body scroll when open
  useEffect(() => {
    if (!isCheckoutOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isCheckoutOpen]);

  const scrollToField = useCallback((element: FocusableField | null) => {
    if (!element) return;
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, 300);
  }, []);

  const focusField = (element: FocusableField | null) => {
    if (!element) return;
    element.focus();
    scrollToField(element);
  };

  const handleNextField = (event: KeyboardEvent<HTMLInputElement>, nextField: FocusableField | null) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    focusField(nextField);
  };

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
            className="fixed inset-x-0 bottom-0 z-50 w-full max-w-full rounded-t-3xl bg-card flex flex-col overflow-hidden overflow-x-hidden md:left-1/2 md:max-w-lg md:-translate-x-1/2"
            style={{ maxHeight: '92dvh' }}
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-display text-lg text-foreground">{t.checkout.title}</h2>
              <button onClick={() => setCheckoutOpen(false)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div
              ref={contentRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-4 [-webkit-overflow-scrolling:touch]"
            >
              {/* Order Type */}
              <div className="mb-4">
                <label className="font-bold text-sm text-foreground block mb-2">{t.checkout.order_type}</label>
                <div className="grid grid-cols-3 gap-2">
                  {orderTypes.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setOrderType(type)}
                      className={`h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-all active:scale-[0.98] ${
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
              <div className="mb-4">
                <label className="font-bold text-sm text-foreground flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-primary" />
                  זמן הכנה
                </label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {PREP_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPrepTime(prepTime === opt.id ? '' : opt.id)}
                      className={`flex-shrink-0 h-9 px-3 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] whitespace-nowrap ${
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
              <div className="space-y-2.5">
                {/* Name */}
                <div>
                  <div className={`flex items-center gap-3 h-11 px-4 rounded-xl bg-secondary min-w-0 ${errors.name ? 'ring-2 ring-destructive' : ''}`}>
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                      ref={nameInputRef}
                      value={customerDetails.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      onFocus={(e) => scrollToField(e.currentTarget)}
                      onKeyDown={(e) => handleNextField(e, phoneInputRef.current)}
                      placeholder={t.checkout.name_placeholder}
                      maxLength={100}
                      autoComplete="name"
                      type="text"
                      inputMode="text"
                      enterKeyHint="next"
                      className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  {errors.name && <p className="text-destructive text-xs mt-1 ps-4">{errors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <div className={`flex items-center gap-3 h-11 px-4 rounded-xl bg-secondary min-w-0 ${errors.phone ? 'ring-2 ring-destructive' : ''}`}>
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <input
                      ref={phoneInputRef}
                      value={customerDetails.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onFocus={(e) => scrollToField(e.currentTarget)}
                      onKeyDown={(e) => handleNextField(e, showDelivery ? addressInputRef.current : notesInputRef.current)}
                      placeholder={t.checkout.phone_placeholder}
                      type="tel"
                      inputMode="tel"
                      enterKeyHint="next"
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
                    <div className={`flex items-center gap-3 h-11 px-4 rounded-xl bg-secondary min-w-0 ${errors.address ? 'ring-2 ring-destructive' : ''}`}>
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <input
                        ref={addressInputRef}
                        value={customerDetails.address}
                        onChange={(e) => {
                          setCustomerDetails({ address: e.target.value });
                          setErrors((p) => ({ ...p, address: '' }));
                        }}
                        onFocus={(e) => scrollToField(e.currentTarget)}
                        onKeyDown={(e) => handleNextField(e, notesInputRef.current)}
                        placeholder={t.checkout.address_placeholder}
                        maxLength={200}
                        autoComplete="street-address"
                        type="text"
                        inputMode="text"
                        enterKeyHint="next"
                        className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                    </div>
                    {errors.address && <p className="text-destructive text-xs mt-1 ps-4">{errors.address}</p>}
                  </div>
                )}

                {/* Notes */}
                <div className="flex items-start gap-3 px-4 py-2.5 rounded-xl bg-secondary min-w-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <textarea
                    ref={notesInputRef}
                    value={customerDetails.notes}
                    onChange={(e) => setCustomerDetails({ notes: e.target.value })}
                    onFocus={(e) => scrollToField(e.currentTarget)}
                    placeholder={t.checkout.notes_placeholder}
                    maxLength={500}
                    enterKeyHint="done"
                    className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none h-14"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 space-y-1.5">
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
            <div className="flex-shrink-0 px-5 py-3 border-t border-border bg-card safe-bottom">
              <button
                onClick={handleSend}
                className="w-full h-12 rounded-full bg-[#25D366] text-primary-foreground font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
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
