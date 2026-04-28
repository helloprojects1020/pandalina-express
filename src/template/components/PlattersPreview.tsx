import type { BitelyxTokens, Dir } from '../tokens';
import ProductCard, { type ProductCardData } from './ProductCard';

export interface PlattersPreviewProps {
  dir: Dir;
  tokens: BitelyxTokens;
  title: string;
  description: string;
  viewAllLabel: string;
  viewAllHref: string;
  items: ProductCardData[];
  quickAddLabel: string;
  onOpen: (id: string) => void;
  onQuickAdd: (id: string) => void;
}

const PlattersPreview = ({
  dir,
  tokens,
  title,
  description,
  viewAllLabel,
  viewAllHref,
  items,
  quickAddLabel,
  onOpen,
  onQuickAdd,
}: PlattersPreviewProps) => (
  <section data-template-component="PlattersPreview" dir={dir} className="py-6 px-4 max-w-screen-xl mx-auto" style={{ background: tokens.bg }}>
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-xl md:text-2xl tracking-tighter uppercase mb-1" style={{ color: tokens.text }}>{title}</h2>
        <p className="text-sm" style={{ color: tokens.muted }}>{description}</p>
      </div>
      <a href={viewAllHref} className="text-sm font-semibold hover:underline flex-shrink-0" style={{ color: tokens.accent }}>
        {viewAllLabel}
      </a>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.slice(0, 2).map((item) => (
        <ProductCard
          key={item.id}
          dir={dir}
          tokens={tokens}
          item={item}
          variant="premium"
          quickAddLabel={quickAddLabel}
          onOpen={onOpen}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  </section>
);

export default PlattersPreview;
