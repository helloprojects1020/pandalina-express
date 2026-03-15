import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus } from 'lucide-react';
import type { MenuItem, CartItemOption, OptionChoice } from '@/types/menu';
import { useCartStore } from '@/store/cartStore';
import { useI18n } from '@/i18n/context';
import Recommendations from './Recommendations';

interface ProductModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

const ProductModal = ({ item, onClose }: ProductModalProps) => {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<CartItemOption[]>([]);
  const [notes, setNotes] = useState('');
  const addItem = useCartStore((s) => s.addItem);
  const updateItem = useCartStore((s) => s.updateItem);
  const editingCartItemId = useCartStore((s) => s.editingCartItemId);
  const items = useCartStore((s) => s.items);
  const setEditingCartItemId = useCartStore((s) => s.setEditingCartItemId);

  const isEditing = !!editingCartItemId;
  const editingCartItem = isEditing ? items.find((i) => i.id === editingCartItemId) : null;

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
    if (!item) return;
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[90vh] flex flex-col md:max-w-lg md:mx-auto"
          >
            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-t-3xl flex-shrink-0">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              <button
                onClick={handleClose}
                className="absolute top-4 end-4 h-9 w-9 rounded-full bg-card/80 backdrop-blur flex items-center justify-center active:scale-95"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2">
              <h2 className="font-display text-xl tracking-tight text-foreground">{item.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              <p className="font-display text-2xl text-primary mt-2">₪{item.price}</p>

              {/* Options */}
              {item.options.map((group) => (
                <div key={group.id} className="mt-5">
                  <h3 className="font-bold text-sm text-foreground mb-2">
                    {group.title}
                    {group.required && <span className="text-primary ms-1">*</span>}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {group.choices.map((choice) => (
                      <button
                        key={choice.id}
                        onClick={() => toggleChoice(group.id, group.title, group.type, choice)}
                        className={`h-9 px-4 rounded-full text-sm font-medium transition-all active:scale-95 ${
                          isChoiceSelected(group.id, choice.id)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {choice.name}
                        {choice.priceModifier > 0 && ` +₪${choice.priceModifier}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div className="mt-5">
                <label className="font-bold text-sm text-foreground block mb-2">{t.product.special_notes}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.product.notes_placeholder}
                  className="w-full h-20 rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Recommendations - only when adding new, not editing */}
              {!isEditing && <Recommendations excludeIds={[item.id]} variant="modal" />}
            </div>

            {/* Sticky footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-border bg-card safe-bottom">
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
                  className="flex-1 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
                >
                  {isEditing ? `${t.product.add_to_cart.replace(t.product.add_to_cart, '✓ עדכון')}` : t.product.add_to_cart} — ₪{lineTotal}
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
