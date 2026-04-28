import { ImageOff } from 'lucide-react';
import type { BitelyxTokens, Dir } from '../tokens';

export interface CategoryCardItem {
  id: string;
  name: string;
  imageUrl?: string;
  href: string;
}

export interface CategoryCardsProps {
  dir: Dir;
  tokens: BitelyxTokens;
  title: string;
  items: CategoryCardItem[];
  onSelect?: (id: string) => void;
}

const CategoryCards = ({ dir, tokens, title, items, onSelect }: CategoryCardsProps) => (
  <section data-template-component="CategoryCards" dir={dir} className="py-10 px-4 max-w-screen-xl mx-auto" style={{ background: tokens.bg }}>
    <h2 className="text-2xl md:text-3xl tracking-tighter uppercase mb-6" style={{ color: tokens.text }}>
      {title}
    </h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((cat) => (
        <a
          key={cat.id}
          href={cat.href}
          onClick={() => onSelect?.(cat.id)}
          className="group relative aspect-[4/3] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform block"
          style={{ background: tokens.surfaceAlt }}
        >
          {cat.imageUrl ? (
            <img
              src={cat.imageUrl}
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div aria-label={cat.name} className="w-full h-full flex items-center justify-center">
              <ImageOff className="w-8 h-8 opacity-40" style={{ color: tokens.muted }} />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${tokens.accent}cc, transparent)` }}
          />
          <div className="absolute bottom-0 start-0 end-0 p-3">
            <h3 className="font-display text-sm md:text-base tracking-tight" style={{ color: tokens.accentText }}>
              {cat.name}
            </h3>
          </div>
        </a>
      ))}
    </div>
  </section>
);

export default CategoryCards;