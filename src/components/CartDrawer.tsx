import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag, Pencil } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useI18n } from '@/i18n/context';
import { localizedName } from '@/lib/localize';
import Recommendations from './Recommendations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CartDrawer = () => {
  const { t, locale } = useI18n();
  const { items, isCartOpen, setCartOpen, setCheckoutOpen, removeItem, updateQuantity, clearCart, getSubtotal, getItemCount, setEditingCartItemId } =
    useCartStore();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const subtotal = getSubtotal();
  const count = getItemCount();
  const excludeIds = items.map((i) => i.menuItem.id);

  const handleEdit = (cartItemId: string) => {
    setEditingCartItemId(cartItemId);
    setCartOpen(false);
  };

  const clearLabel = locale === 'ar' ? 'مسح السلة' : locale === 'he' ? 'נקה סל' : 'Clear Cart';
  const clearConfirmTitle = locale === 'ar' ? 'مسح السلة؟' : locale === 'he' ? 'לנקות את הסל?' : 'Clear cart?';
  const clearConfirmDesc = locale === 'ar' ? 'سيتم حذف جميع العناصر من السلة.' : locale === 'he' ? 'כל הפריטים יוסרו מהסל.' : 'All items will be removed from the cart.';
  const cancelLabel = locale === 'ar' ? 'إلغاء' : locale === 'he' ? 'ביטול' : 'Cancel';
  const confirmLabel = locale === 'ar' ? 'نعم، مسح' : locale === 'he' ? 'כן, נקה' : 'Yes, Clear';

  return (
    <>
      <AnimatePresence>
        {isCartOpen && (
          <>
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
              className="fixed end-0 top-0 bottom-0 z-50 w-full max-w-md bg-card flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-lg text-foreground">{t.cart.title}</h2>
                  <span className="text-xs text-muted-foreground">
                    {t.cart.items_count.replace('{{count}}', String(count))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="text-xs text-destructive font-semibold px-3 py-1.5 rounded-full bg-destructive/10 active:scale-95 transition-transform"
                    >
                      {clearLabel}
                    </button>
                  )}
                  <button onClick={() => setCartOpen(false)} className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="font-bold text-foreground">{t.cart.empty_title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t.cart.empty_desc}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 bg-secondary/50 rounded-2xl p-3">
                        <img
                          src={item.menuItem.image}
                          alt={localizedName(item.menuItem, locale)}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-bold text-sm text-foreground truncate">{localizedName(item.menuItem, locale)}</h3>
                            <button
                              onClick={() => handleEdit(item.id)}
                              className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full bg-card text-muted-foreground hover:text-primary active:scale-95 transition-colors"
                              aria-label="Edit item"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {item.selectedOptions.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.selectedOptions.flatMap((o) => o.selectedChoices.map((c) => localizedName(c, locale))).join(', ')}
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

              {/* Recommendations — outside overflow-y-auto to avoid scroll context conflict */}
              {items.length > 0 && (
                <div className="border-t border-border/60 bg-card flex-shrink-0">
                  <Recommendations excludeIds={excludeIds} variant="cart" />
                </div>
              )}

              {/* Footer */}
              {items.length > 0 && (
                <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{t.cart.subtotal}</span>
                    <span className="font-display text-lg text-foreground">₪{subtotal}</span>
                  </div>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutOpen(true);
                    }}
                    className="w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
                  >
                    {t.cart.checkout} — ₪{subtotal}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Clear cart confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{clearConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{clearConfirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearCart();
                setShowClearConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CartDrawer;
