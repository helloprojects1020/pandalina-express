import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

const CartDrawer = () => {
  const { items, isCartOpen, setCartOpen, setCheckoutOpen, removeItem, updateQuantity, getSubtotal, getItemCount } =
    useCartStore();

  if (!isCartOpen) return null;

  const subtotal = getSubtotal();
  const count = getItemCount();

  return (
    <AnimatePresence>
      <motion.div
        key="cart-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
        onClick={() => setCartOpen(false)}
      />
      <motion.div
        key="cart-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg text-foreground">Your Cart</h2>
            <span className="text-xs text-muted-foreground">({count} items)</span>
          </div>
          <button onClick={() => setCartOpen(false)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="font-bold text-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Add some delicious items!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 bg-secondary/50 rounded-2xl p-3">
                  <img
                    src={item.menuItem.image}
                    alt={item.menuItem.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">{item.menuItem.name}</h3>
                    {item.selectedOptions.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.selectedOptions.flatMap((o) => o.selectedChoices.map((c) => c.name)).join(', ')}
                      </p>
                    )}
                    {item.notes && <p className="text-xs text-muted-foreground italic truncate">{item.notes}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center bg-card rounded-full">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-7 w-7 flex items-center justify-center active:scale-95">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-7 w-7 flex items-center justify-center active:scale-95">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm text-primary">₪{item.lineTotal}</span>
                        <button onClick={() => removeItem(item.id)} className="h-7 w-7 flex items-center justify-center text-destructive active:scale-95">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-display text-lg text-foreground">₪{subtotal}</span>
            </div>
            <button
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
            >
              Checkout — ₪{subtotal}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default CartDrawer;
