import type { MenuItem } from '@/types/menu';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
}

const ProductCard = ({ item, onOpen }: ProductCardProps) => {
  return (
    <button
      onClick={() => onOpen(item)}
      className="group relative flex flex-col gap-2 p-2 bg-card rounded-2xl shadow-card border border-transparent text-left active:scale-[0.98] transition-transform w-full"
    >
      <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
        <img
          src={item.image}
          alt={item.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="flex flex-col flex-1 px-1 pb-1">
        <h3 className="font-bold text-sm leading-tight line-clamp-2 text-foreground">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
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
