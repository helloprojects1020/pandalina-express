import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories, getItemsByCategory } from '@/data/menu';
import type { MenuItem } from '@/types/menu';
import { useI18n } from '@/i18n/context';
import { localizedDescription } from '@/lib/localize';
import CategoryNav from './CategoryNav';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import NoodleBuilder from './NoodleBuilder';

const MenuSection = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [noodleOpen, setNoodleOpen] = useState(false);

  const handleOpenItem = (item: MenuItem) => {
    if (item.categoryId === 'noodles' && item.id === 'noodle-bowl') {
      setNoodleOpen(true);
    } else {
      setSelectedItem(item);
    }
  };

  return (
    <div id="menu">
      <CategoryNav activeCategory={activeCategory} onSelect={setActiveCategory} />

      {/* Category previews (excluding platters — shown separately above) */}
      {categories
        .filter((cat) => cat.id !== 'platters')
        .map((cat) => {
          const items = getItemsByCategory(cat.id);
          const previewItems = items.slice(0, 4);
          const categoryLabel =
            t.categories[cat.id as keyof typeof t.categories] || cat.name;

          return (
            <section
              key={cat.id}
              id={`category-${cat.id}`}
              className="py-6 px-4 max-w-screen-xl mx-auto scroll-mt-28"
            >
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl tracking-tighter uppercase text-foreground mb-1">
                    {categoryLabel}
                  </h2>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </div>
                {items.length > previewItems.length && (
                  <button
                    onClick={() => navigate(`/category/${cat.slug}`)}
                    className="text-primary text-sm font-semibold hover:underline flex-shrink-0"
                  >
                    {(t.categories as Record<string, string>).view_all || 'View All →'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {previewItems.map((item) => (
                  <ProductCard key={item.id} item={item} onOpen={handleOpenItem} />
                ))}
              </div>
            </section>
          );
        })}

      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <NoodleBuilder open={noodleOpen} onClose={() => setNoodleOpen(false)} />
    </div>
  );
};

export default MenuSection;
