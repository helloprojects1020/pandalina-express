import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useI18n } from '@/i18n/context';
import { motion, AnimatePresence } from 'framer-motion';

const FloatingCart = () => {
  const { t } = useI18n();
  const { setCartOpen, getItemCount, getSubtotal } = useCartStore();
  const count = getItemCount();
  const subtotal = getSubtotal();

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          key="floating-cart"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 end-4 start-4 md:start-auto md:end-6 md:w-72 z-40 h-14 rounded-2xl bg-accent text-accent-foreground flex items-center justify-between px-5 shadow-elevated active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1.5 -end-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            </div>
            <span className="font-bold text-sm">{t.cart.view_cart}</span>
          </div>
          <span className="font-display text-sm">₪{subtotal}</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default FloatingCart;
