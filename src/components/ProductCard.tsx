import type { MenuItem } from '@/types/menu';
import { useI18n } from '@/i18n/context';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
  variant?: 'default' | 'premium';
}

const BEST_SELLER_IDS = ['sushi-1', 'sushi-4', 'sushi-11', 'sushi-8'];

const ProductCard = ({ item, onOpen, variant = 'default' }: ProductCardProps) => {
  const { t } = useI18n();
  const isBestSeller = BEST_SELLER_IDS.includes(item.id);
  const isPremium = variant === 'premium';

  return (
    <button
      onClick={() => onOpen(item)}
      className={`group relative flex flex-col gap-2 bg-card rounded-2xl shadow-card border border-transparent text-start active:scale-[0.98] transition-transform w-full ${
        isPremium ? 'p-0 overflow-hidden' : 'p-2'
      }`}
    >
      {/* Badges */}
      {isBestSeller && (
        <span className="absolute top-3 start-3 z-10 bg-accent text-accent-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
          {t.menu.best_seller_badge}
        </span>
      )}

      <div className={`overflow-hidden bg-secondary ${isPremium ? 'aspect-[16/10]' : 'aspect-square rounded-xl'}`}>
        <img
          src={item.image}
          alt={item.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className={`flex flex-col flex-1 pb-1 ${isPremium ? 'px-4 py-3' : 'px-1'}`}>
        <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
        {isPremium && item.tags.includes('platter') && (
          <span className="text-[10px] text-primary font-semibold mt-1">{t.menu.premium_badge}</span>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-display text-primary text-base">₪{item.price}</span>
          <span className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </span>
        </div>
      </div>
    </button>
  );
};

export default ProductCard;
