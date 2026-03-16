import type { MenuItem } from '@/types/menu';
import { useI18n } from '@/i18n/context';
import { localizedName, localizedDescription } from '@/lib/localize';
import { useCartStore } from '@/store/cartStore';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { handleImageError } from '@/lib/imageFallback';

interface ProductCardProps {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
  variant?: 'default' | 'premium';
}

const BADGE_MAP: Record<string, { emoji: string; label: string }> = {
  'crunchy-roll': { emoji: '⭐', label: 'Most Popular' },
  'dragon-roll': { emoji: '🔥', label: "Chef's Choice" },
  'rainbow-roll': { emoji: '👑', label: 'Top Pick' },
  'asadoaki': { emoji: '🔥', label: "Chef's Choice" },
  'crispy-salmon': { emoji: '⭐', label: 'Most Popular' },
  'family-sushi-platter': { emoji: '⭐', label: 'Most Popular' },
  'party-sushi-tray': { emoji: '👑', label: 'Top Pick' },
  'build-your-noodle-bowl': { emoji: '🔥', label: "Chef's Choice" },
};

const ProductCard = ({ item, onOpen, variant = 'default' }: ProductCardProps) => {
  const { t, locale } = useI18n();
  const addItem = useCartStore((s) => s.addItem);
  const isPremium = variant === 'premium';
  const badge = BADGE_MAP[item.id];

  const hasOptions = item.options.length > 0 || item.isCustomizable;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasOptions) {
      onOpen(item);
    } else {
      addItem(item, 1, [], '');
      toast({
        title: `${localizedName(item, locale)} ✓`,
        description: `₪${item.price}`,
      });
    }
  };

  return (
    <div
      className={`group relative flex flex-col gap-2 bg-card rounded-2xl shadow-card border border-transparent text-start w-full ${
        isPremium ? 'p-0 overflow-hidden' : 'p-2'
      }`}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute top-3 start-3 z-10 bg-accent text-accent-foreground text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
          <span>{badge.emoji}</span> {badge.label}
        </span>
      )}

      {/* Clickable area: image + text opens modal */}
      <button
        onClick={() => onOpen(item)}
        className={`overflow-hidden bg-secondary active:scale-[0.98] transition-transform ${isPremium ? 'aspect-[16/10]' : 'aspect-square rounded-xl'}`}
      >
        <img
          src={item.image}
          alt={localizedName(item, locale)}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </button>
      <button onClick={() => onOpen(item)} className={`flex flex-col flex-1 pb-1 text-start ${isPremium ? 'px-4 py-3' : 'px-1'}`}>
        <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground">{localizedName(item, locale)}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{localizedDescription(item, locale)}</p>
        {isPremium && item.tags.includes('platter') && (
          <span className="text-[10px] text-primary font-semibold mt-1">{t.menu.premium_badge}</span>
        )}
      </button>
      <div className={`flex items-center justify-between ${isPremium ? 'px-4 pb-3' : 'px-1 pb-1'}`}>
        <span className="font-display text-primary text-base">₪{item.price}</span>
        <button
          onClick={handleQuickAdd}
          className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center active:scale-90 transition-transform"
          aria-label={t.product.quick_add}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
