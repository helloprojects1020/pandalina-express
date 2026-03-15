import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, User, Phone, MessageSquare, Truck, Store, UtensilsCrossed } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { generateWhatsAppLink } from '@/lib/whatsapp';
import type { OrderType } from '@/types/menu';

const orderTypes: { type: OrderType; label: string; icon: React.ElementType }[] = [
  { type: 'pickup', label: 'Pickup', icon: Store },
  { type: 'delivery', label: 'Delivery', icon: Truck },
  { type: 'eat-in', label: 'Eat In', icon: UtensilsCrossed },
];

const CheckoutSheet = () => {
  const {
    items, isCheckoutOpen, setCheckoutOpen, customerDetails, setCustomerDetails,
    setOrderType, getSubtotal, getTotal, deliveryFee,
  } = useCartStore();
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  if (!isCheckoutOpen) return null;

  const subtotal = getSubtotal();
  const total = getTotal();
  const showDelivery = customerDetails.orderType === 'delivery';

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!customerDetails.name.trim()) e.name = true;
    if (!customerDetails.phone.trim()) e.phone = true;
    if (showDelivery && !customerDetails.address.trim()) e.address = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = () => {
    if (!validate()) return;
    const link = generateWhatsAppLink(items, customerDetails, subtotal, deliveryFee, total);
    window.open(link, '_blank');
  };

  return (
    <AnimatePresence>
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[90vh] flex flex-col md:max-w-lg md:mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="font-display text-lg text-foreground">Complete Your Order</h2>
          <button onClick={() => setCheckoutOpen(false)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {/* Order Type */}
          <div className="mb-5">
            <label className="font-bold text-sm text-foreground block mb-2">Order Type</label>
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

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <div className={`flex items-center gap-3 h-12 px-4 rounded-xl bg-secondary ${errors.name ? 'ring-2 ring-destructive' : ''}`}>
                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={customerDetails.name}
                  onChange={(e) => setCustomerDetails({ name: e.target.value })}
                  placeholder="Your name"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
            <div>
              <div className={`flex items-center gap-3 h-12 px-4 rounded-xl bg-secondary ${errors.phone ? 'ring-2 ring-destructive' : ''}`}>
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({ phone: e.target.value })}
                  placeholder="Phone number"
                  type="tel"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>
            {showDelivery && (
              <div>
                <div className={`flex items-center gap-3 h-12 px-4 rounded-xl bg-secondary ${errors.address ? 'ring-2 ring-destructive' : ''}`}>
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    value={customerDetails.address}
                    onChange={(e) => setCustomerDetails({ address: e.target.value })}
                    placeholder="Delivery address"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
            )}
            <div>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-secondary">
                <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <textarea
                  value={customerDetails.notes}
                  onChange={(e) => setCustomerDetails({ notes: e.target.value })}
                  placeholder="Additional notes (optional)"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none h-16"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-semibold">₪{subtotal}</span>
            </div>
            {showDelivery && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="text-foreground font-semibold">₪{deliveryFee}</span>
              </div>
            )}
            <div className="flex justify-between text-base border-t border-border pt-2">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-display text-primary text-lg">₪{total}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card">
          <button
            onClick={handleSend}
            className="w-full h-14 rounded-full bg-[#25D366] text-primary-foreground font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            Send Order to WhatsApp — ₪{total}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CheckoutSheet;
