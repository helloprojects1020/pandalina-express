import type { BitelyxTokens, Dir } from '../tokens';

export interface CategoryNavItem {
  id: string;
  label: string;
}

export interface CategoryNavProps {
  dir: Dir;
  tokens: BitelyxTokens;
  categories: CategoryNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

const CategoryNav = ({ dir, tokens, categories, activeId, onSelect }: CategoryNavProps) => (
  <div
    data-template-component="CategoryNav"
    dir={dir}
    className="sticky top-14 z-30 backdrop-blur-md border-b"
    style={{ background: `${tokens.bg}f2`, borderColor: tokens.border }}
  >
    <div className="max-w-screen-xl mx-auto">
      <nav className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => {
          const active = cat.id === activeId;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-95"
              style={
                active
                  ? { background: tokens.accent, color: tokens.accentText }
                  : { background: tokens.surfaceAlt, color: tokens.text }
              }
            >
              {cat.label}
            </button>
          );
        })}
      </nav>
    </div>
  </div>
);

export default CategoryNav;