import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { MenuItem, CartItemOption, OptionChoice } from '@/types/menu';
import { useCartStore } from '@/store/cartStore';
import { useMenu } from '@/hooks/useMenu';
import { useI18n } from '@/i18n/context';
import { localizedName, localizedDescription, localizedTitle } from '@/lib/localize';
import Recommendations from './Recommendations';
import { handleImageError } from '@/lib/imageFallback';

interface ProductModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

const ProductModal = ({ item, onClose }: ProductModalProps) => {
  const { t, locale } = useI18n();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<CartItemOption[]>([]);
  const [notes, setNotes] = useState('');
  const addItem = useCartStore((s) => s.addItem);
  const updateItem = useCartStore((s) => s.updateItem);
  const editingCartItemId = useCartStore((s) => s.editingCartItemId);
  const items = useCartStore((s) => s.items);
  const setEditingCartItemId = useCartStore((s) => s.setEditingCartItemId);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const { outOfStockIds, inventoryTrackingEnabled } = useMenu();

  const cartItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  const isEditing = !!editingCartItemId;
  const editingCartItem = isEditing ? items.find((i) => i.id === editingCartItemId) : null;

  // item is null when modal is closed — only compute when open
  const blockOrdering = !!item && inventoryTrackingEnabled && outOfStockIds.has(item.id);

  // Load editing item values when editing starts
  useEffect(() => {
    if (editingCartItem) {
      setQuantity(editingCartItem.quantity);
      setSelectedOptions(editingCartItem.selectedOptions);
      setNotes(editingCartItem.notes);
    }
  }, [editingCartItem]);

  const toggleChoice = (groupId: string, groupTitle: string, type: string, choice: OptionChoice) => {
    setSelectedOptions((prev) => {
      const existing = prev.find((o) => o.groupId === groupId);
      if (type === 'single') {
        return [
          ...prev.filter((o) => o.groupId !== groupId),
          { groupId, groupTitle, selectedChoices: [choice] },
        ];
      }
      if (existing) {
        const has = existing.selectedChoices.find((c) => c.id === choice.id);
        if (has) {
          const filtered = existing.selectedChoices.filter((c) => c.id !== choice.id);
          return filtered.length
            ? prev.map((o) => (o.groupId === groupId ? { ...o, selectedChoices: filtered } : o))
            : prev.filter((o) => o.groupId !== groupId);
        }
        return prev.map((o) =>
          o.groupId === groupId ? { ...o, selectedChoices: [...o.selectedChoices, choice] } : o
        );
      }
      return [...prev, { groupId, groupTitle, selectedChoices: [choice] }];
    });
  };

  const isChoiceSelected = (groupId: string, choiceId: string) =>
    selectedOptions.some((o) => o.groupId === groupId && o.selectedChoices.some((c) => c.id === choiceId));

  const optionsTotal = selectedOptions.reduce(
    (sum, o) => sum + o.selectedChoices.reduce((s, c) => s + c.priceModifier, 0),
    0
  );
  const price = item?.price ?? 0;
  const lineTotal = (price + optionsTotal) * quantity;

  const handleClose = () => {
    setEditingCartItemId(null);
    onClose();
    setQuantity(1);
    setSelectedOptions([]);
    setNotes('');
  };

  const handleSave = () => {
    if (!item || blockOrdering) return;
    if (isEditing && editingCartItemId) {
      updateItem(editingCartItemId, quantity, selectedOptions, notes);
    } else {
      addItem(item, quantity, selectedOptions, notes);
    }
    handleClose();
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            key="product-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            key="product-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[85dvh] flex flex-col md:max-w-lg md:mx-auto"
          >
            {/* Image */}
            <div className="relative h-44 overflow-hidden rounded-t-3xl flex-shrink-0">
              <img
                src={item.image}
                alt={localizedName(item, locale)}
                className={`w-full h-full object-cover ${blockOrdering ? 'grayscale opacity-60' : ''}`}
                onError={handleImageError}
              />
              {blockOrdering && (
                <>
                  <div className="absolute inset-0 bg-black/40" />
                  <span className="absolute top-3 start-3 bg-destructive text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                    אזל מהמלאי
                  </span>
                </>
              )}
              <button
                onClick={handleClose}
                className="absolute top-4 end-4 h-9 w-9 rounded-full bg-card/80 backdrop-blur flex items-center justify-center active:scale-95"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
              <h2 className="font-display text-xl tracking-tight text-foreground">{localizedName(item, locale)}</h2>
              <p className="text-sm text-muted-foreground mt-1">{localizedDescription(item, locale)}</p>
              <p className="font-display text-2xl text-primary mt-2">₪{item.price}</p>

              {/* Options */}
              {item.options.map((group) => (
                <div key={group.id} className="mt-5">
                  <h3 className="font-bold text-sm text-foreground mb-2">
                    {localizedTitle(group, locale)}
                    {group.required && <span className="text-primary ms-1">*</span>}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {group.choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() => toggleChoice(group.id, localizedTitle(group, locale), group.type, choice)}
                        className={`h-9 px-4 rounded-full text-sm font-medium transition-all active:scale-95 ${
                          isChoiceSelected(group.id, choice.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {localizedName(choice, locale)}
                        {choice.priceModifier > 0 && ` +₪${choice.priceModifier}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div className="mt-5 pb-3">
                <label className="font-bold text-sm text-foreground block mb-2">{t.product.special_notes}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.product.notes_placeholder}
                  className="w-full h-20 rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/*
             * Recommendations lives OUTSIDE the overflow-y-auto container.
             * This is critical: when a parent has overflow-y:auto the browser
             * computes overflow-x to auto as well (CSS spec), turning the parent
             * into a scroll container in both axes and intercepting horizontal
             * touch gestures before our inner scroll div can claim them.
             * By placing Recommendations here (a direct flex child of the modal),
             * its horizontal scroll container has no overflow-y parent interference.
             */}
            {!isEditing && (
              <div className="border-t border-border/60 bg-card flex-shrink-0">
                <Recommendations excludeIds={[item.id]} variant="modal" />
              </div>
            )}

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card safe-bottom space-y-3">
              {/* Live cart summary — updates immediately when recommendations are added */}
              {cartItemCount > 0 && !isEditing && (
                <button
                  onClick={() => setCartOpen(true)}
                  className="w-full h-10 rounded-xl bg-secondary flex items-center justify-between px-4 active:opacity-80 transition-opacity"
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    {cartItemCount} פריטים בעגלה
                  </span>
                  <span className="text-sm font-bold text-primary">₪{cartTotal} &rsaquo;</span>
                </button>
              )}
              {blockOrdering && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                  <p className="text-sm font-bold text-destructive">המוצר אזל מהמלאי</p>
                  <p className="text-xs text-destructive/80 mt-0.5">אנא בחר מוצר אחר</p>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-secondary rounded-full">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10 flex items-center justify-center active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-foreground">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-10 w-10 flex items-center justify-center active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  disabled={blockOrdering}
                  className={`flex-1 h-12 rounded-full font-bold text-sm transition-transform ${
                    blockOrdering
                      ? 'bg-muted text-muted-foreground cursor-not-allowed pointer-events-none opacity-70'
                      : 'bg-primary text-primary-foreground active:scale-95'
                  }`}
                >
                  {blockOrdering
                    ? 'המוצר אזל מהמלאי'
                    : `${isEditing ? '✓ עדכון' : t.product.add_to_cart} — ₪${lineTotal}`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductModal;
