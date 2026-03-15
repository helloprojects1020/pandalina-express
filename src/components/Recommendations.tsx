import { useI18n } from '@/i18n/context';
import { useCartStore } from '@/store/cartStore';
import { menuItems } from '@/data/menu';
import type { MenuItem } from '@/types/menu';
import { Plus } from 'lucide-react';

const RECOMMENDATION_IDS = ['kitchen-5', 'kitchen-7', 'kitchen-3', 'sushi-1', 'kitchen-8', 'kitchen-6'];

interface RecommendationsProps {
  title?: string;
  excludeIds?: string[];
  variant?: 'modal' | 'cart';
}

const Recommendations = ({ title, excludeIds = [], variant = 'modal' }: RecommendationsProps) => {
  const { t } = useI18n();
  const addItem = useCartStore((s) => s.addItem);

  const items = RECOMMENDATION_IDS
    .map((id) => menuItems.find((m) => m.id === id))
    .filter((m): m is MenuItem => !!m && !excludeIds.includes(m.id))
    .slice(0, 5);

  if (items.length === 0) return null;

  const label = title || (variant === 'cart' ? t.cart.you_may_like : t.product.also_order);

  const handleQuickAdd = (item: MenuItem) => {
    addItem(item, 1, [], '');
  };

  return (
    <div className={variant === 'cart' ? 'px-5 pb-4' : 'mt-5'}>
      <h3 className="font-bold text-sm text-foreground mb-3">{label}</h3>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-28 bg-secondary/50 rounded-xl overflow-hidden"
          >
            <img src={item.image} alt={item.name} className="w-full aspect-square object-cover" loading="lazy" />
            <div className="p-2">
              <p className="text-xs font-semibold text-foreground line-clamp-1">{item.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs font-display text-primary">₪{item.price}</span>
                <button
                  onClick={() => handleQuickAdd(item)}
                  className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center active:scale-90 transition-transform"
                  aria-label={t.product.quick_add}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;
