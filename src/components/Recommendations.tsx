import { useRef } from 'react';
import { useI18n } from '@/i18n/context';
import { useCartStore } from '@/store/cartStore';
import { useMenu } from '@/hooks/useMenu';
import type { MenuItem } from '@/types/menu';
import { localizedName } from '@/lib/localize';
import { Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleImageError } from '@/lib/imageFallback';

const RECOMMENDATION_SLUGS = [
  'egg-roll',
  'chicken-popcorn',
  'avocado-salad',
  'crunchy-roll',
  'chicken-bao',
  'crispy-shrimp-tempura',
];

interface RecommendationsProps {
  title?: string;
  excludeIds?: string[];
  variant?: 'modal' | 'cart';
}

const Recommendations = ({ title, excludeIds = [] }: RecommendationsProps) => {
  const { t, locale } = useI18n();

  const cartItems = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const { menuItems, outOfStockIds, inventoryTrackingEnabled } = useMenu();
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = RECOMMENDATION_SLUGS
    .map((slug) => menuItems.find((m) => m.slug === slug))
    .filter((m): m is MenuItem => {
      if (!m) return false;
      if (excludeIds.includes(m.id)) return false;
      if (inventoryTrackingEnabled && outOfStockIds.has(m.id)) return false;
      return true;
    })
    .slice(0, 6);

  if (items.length === 0) return null;

  const label = title || 'אולי תרצה להוסיף גם';

  // Scroll by a card-width forward/back. In RTL the logical scroll direction is
  // reversed: scrollBy({ left: -N }) moves the viewport to the left (shows next items).
  const scrollForward = () => scrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' });
  const scrollBack = () => scrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' });

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Header row with arrow buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: '20px', marginBottom: '10px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '14px', margin: 0 }} className="text-foreground">
          {label}
        </h3>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* In RTL: ChevronRight points toward start (right) = go back */}
          <button
            onClick={scrollBack}
            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="bg-secondary text-foreground"
            aria-label="גלול אחורה"
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
          {/* In RTL: ChevronLeft points toward end (left) = go forward */}
          <button
            onClick={scrollForward}
            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="bg-secondary text-foreground"
            aria-label="גלול קדימה"
          >
            <ChevronLeft style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/*
       * The scroll container uses ONLY inline styles for scroll-critical properties.
       * Tailwind utility classes have been known to be purged or conflict in this
       * project. Inline styles are applied directly and cannot be purged.
       *
       * overflow-x: auto   → enables horizontal scroll when content overflows
       * touch-action: pan-x → tells the browser this element owns horizontal swipe;
       *                       without this, iOS gives the gesture to a parent scroller
       * scrollbar-hide class → just hides the visual scrollbar (cosmetic only)
       *)
       */}
      <div
        ref={scrollRef}
        className="scrollbar-hide"
        style={{
          overflowX: 'auto',
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/*
         * width: max-content is ESSENTIAL.
         * A flex container with width:auto fills its parent (same width as scroll container).
         * Even with flex-shrink:0 on children, their overflow is contained WITHIN the flex
         * row at the same width as the scroll container → no scroll container overflow.
         * width:max-content forces the row to be as wide as all its children combined,
         * which exceeds the scroll container width and enables scroll.
         */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            width: 'max-content',
            paddingInlineStart: '20px',
            paddingInlineEnd: '20px',
            paddingBottom: '8px',
          }}
        >
          {items.map((item) => {
            const cartEntry = cartItems.find((ci) => ci.menuItem.id === item.id);
            const qtyInCart = cartEntry?.quantity ?? 0;
            const isInCart = qtyInCart > 0;

            const handleAdd = (e: React.MouseEvent) => {
              e.stopPropagation();
              addItem(item, 1, [], '');
              toast({
                title: `${localizedName(item, locale)} נוסף לעגלה ✓`,
                description: `₪${item.price}`,
              });
            };

            const handleIncrease = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (cartEntry) updateQuantity(cartEntry.id, qtyInCart + 1);
            };

            const handleDecrease = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (cartEntry) updateQuantity(cartEntry.id, qtyInCart - 1);
            };

            return (
              <div
                key={item.id}
                style={{ flexShrink: 0, width: '128px' }}
                className={`bg-card rounded-2xl overflow-hidden border shadow-sm transition-all duration-200 ${
                  isInCart ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50'
                }`}
              >
                <div className="relative w-full h-20 overflow-hidden">
                  <img
                    src={item.image}
                    alt={localizedName(item, locale)}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={handleImageError}
                  />
                  {isInCart && (
                    <span className="absolute top-1.5 end-1.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {qtyInCart}
                    </span>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-xs font-semibold line-clamp-1 text-foreground leading-tight">
                    {localizedName(item, locale)}
                  </p>
                  <div className="flex items-center justify-between mt-2 gap-1">
                    <span className="text-xs font-display text-primary flex-shrink-0">₪{item.price}</span>

                    {isInCart ? (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={handleDecrease}
                          className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                          aria-label="הפחת כמות"
                        >
                          <Minus className="w-3 h-3 text-foreground" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-foreground tabular-nums">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={handleIncrease}
                          className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                          aria-label="הגדל כמות"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleAdd}
                        className="h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                        aria-label={t.product.quick_add}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ flexShrink: 0, width: '8px' }} aria-hidden />
        </div>
      </div>
    </div>
  );
};

export default Recommendations;