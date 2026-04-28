import { X, Minus, Plus, Trash2, ShoppingBag, Pencil } from 'lucide-react';
import type { BitelyxTokens, Dir } from '../tokens';

export interface CartLineItem {
  id: string;
  name: string;
  imageUrl: string;
  optionsLabel?: string;
  notes?: string;
  quantity: number;
  lineTotal: number;
}

export interface CartDrawerProps {
  dir: Dir;
  tokens: BitelyxTokens;
  isOpen: boolean;
  title: string;
  itemsCountLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  subtotalLabel: string;
  checkoutLabel: string;
  clearLabel: string;
  currencySymbol: string;
  items: CartLineItem[];
  subtotal: number;
  onClose: () => void;
  onClear: () => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onCheckout: () => void;
}

const CartDrawer = ({
  dir,
  tokens,
  isOpen,
  title,
  itemsCountLabel,
  emptyTitle,
  emptyDescription,
  subtotalLabel,
  checkoutLabel,
  clearLabel,
  currencySymbol,
  items,
  subtotal,
  onClose,
  onClear,
  onIncrement,
  onDecrement,
  onRemove,
  onEdit,
  onCheckout,
}: CartDrawerProps) => {
  if (!isOpen) return null;

  return (
    <div dir={dir}>
      <div
        className="fixed inset-0 z-50 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <div
        className="fixed end-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col"
        style={{ background: tokens.surface, color: tokens.text }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: tokens.border }}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" style={{ color: tokens.accent }} />
            <h2 className="font-display text-lg">{title}</h2>
            <span className="text-xs" style={{ color: tokens.muted }}>{itemsCountLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs font-semibold px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                style={{ color: tokens.danger, background: `${tokens.danger}1a` }}
              >
                {clearLabel}
              </button>
            )}
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full flex items-center justify-center active:scale-95"
              style={{ background: tokens.surfaceAlt }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-12 h-12 mb-4" style={{ color: `${tokens.muted}4d` }} />
              <p className="font-bold">{emptyTitle}</p>
              <p className="text-sm mt-1" style={{ color: tokens.muted }}>{emptyDescription}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-2xl p-3" style={{ background: `${tokens.surfaceAlt}80` }}>
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-bold text-sm truncate">{item.name}</h3>
                      <button
                        onClick={() => onEdit(item.id)}
                        aria-label="Edit"
                        className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full active:scale-95 transition-colors"
                        style={{ background: tokens.surface, color: tokens.muted }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {item.optionsLabel && (
                      <p className="text-xs truncate" style={{ color: tokens.muted }}>{item.optionsLabel}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs italic truncate" style={{ color: tokens.muted }}>{item.notes}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center rounded-full" style={{ background: tokens.surface }}>
                        <button onClick={() => onDecrement(item.id)} className="h-7 w-7 flex items-center justify-center active:scale-95">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                        <button onClick={() => onIncrement(item.id)} className="h-7 w-7 flex items-center justify-center active:scale-95">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm" style={{ color: tokens.accent }}>
                          {currencySymbol}{item.lineTotal}
                        </span>
                        <button onClick={() => onRemove(item.id)} className="h-7 w-7 flex items-center justify-center active:scale-95" style={{ color: tokens.danger }}>
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

        {items.length > 0 && (
          <div className="flex-shrink-0 px-5 py-4 border-t" style={{ borderColor: tokens.border, background: tokens.surface }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: tokens.muted }}>{subtotalLabel}</span>
              <span className="font-display text-lg">{currencySymbol}{subtotal}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full h-12 rounded-full font-bold text-sm active:scale-95 transition-transform"
              style={{ background: tokens.accent, color: tokens.accentText }}
            >
              {checkoutLabel} — {currencySymbol}{subtotal}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
