import type { BitelyxTokens, Dir } from '../tokens';
import ProductCard, { type ProductCardData } from './ProductCard';

export interface BestSellersProps {
  dir: Dir;
  tokens: BitelyxTokens;
  title: string;
  items: ProductCardData[];
  quickAddLabel: string;
  onOpen: (id: string) => void;
  onQuickAdd: (id: string) => void;
}

const BestSellers = ({ dir, tokens, title, items, quickAddLabel, onOpen, onQuickAdd }: BestSellersProps) => (
  <section data-template-component="BestSellers" dir={dir} className="py-8 px-4 max-w-screen-xl mx-auto" style={{ background: tokens.bg }}>
    <h2 className="text-2xl md:text-3xl tracking-tighter uppercase mb-5" style={{ color: tokens.text }}>{title}</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.slice(0, 4).map((item) => (
        <ProductCard
          key={item.id}
          dir={dir}
          tokens={tokens}
          item={item}
          quickAddLabel={quickAddLabel}
          onOpen={onOpen}
          onQuickAdd={onQuickAdd}
        />
      ))}
    </div>
  </section>
);

export default BestSellers;
