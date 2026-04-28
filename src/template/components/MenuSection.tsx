import type { BitelyxTokens, Dir } from '../tokens';
import CategoryNav, { type CategoryNavItem } from './CategoryNav';
import ProductCard, { type ProductCardData } from './ProductCard';

export interface MenuCategoryGroup {
  id: string;
  label: string;
  description: string;
  href: string;
  items: ProductCardData[];
}

export interface MenuSectionProps {
  dir: Dir;
  tokens: BitelyxTokens;
  categories: MenuCategoryGroup[];
  activeCategoryId: string;
  viewAllLabel: string;
  quickAddLabel: string;
  onSelectCategory: (id: string) => void;
  onOpenItem: (itemId: string) => void;
  onQuickAdd: (itemId: string) => void;
}

const MenuSection = ({
  dir,
  tokens,
  categories,
  activeCategoryId,
  viewAllLabel,
  quickAddLabel,
  onSelectCategory,
  onOpenItem,
  onQuickAdd,
}: MenuSectionProps) => {
  const navItems: CategoryNavItem[] = categories.map((c) => ({ id: c.id, label: c.label }));

  return (
    <div data-template-component="MenuSection" dir={dir} style={{ background: tokens.bg }}>
      <CategoryNav
        dir={dir}
        tokens={tokens}
        categories={navItems}
        activeId={activeCategoryId}
        onSelect={onSelectCategory}
      />

      {categories.map((cat) => {
        const previewItems = cat.items.slice(0, 4);
        return (
          <section
            key={cat.id}
            id={`category-${cat.id}`}
            className="py-6 px-4 max-w-screen-xl mx-auto scroll-mt-28"
          >
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl md:text-2xl tracking-tighter uppercase mb-1" style={{ color: tokens.text }}>
                  {cat.label}
                </h2>
                <p className="text-sm" style={{ color: tokens.muted }}>{cat.description}</p>
              </div>
              {cat.items.length > previewItems.length && (
                <a
                  href={cat.href}
                  className="text-sm font-semibold hover:underline flex-shrink-0"
                  style={{ color: tokens.accent }}
                >
                  {viewAllLabel}
                </a>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {previewItems.map((item) => (
                <ProductCard
                  key={item.id}
                  dir={dir}
                  tokens={tokens}
                  item={item}
                  quickAddLabel={quickAddLabel}
                  onOpen={onOpenItem}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default MenuSection;
