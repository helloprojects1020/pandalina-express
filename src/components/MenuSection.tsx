import { useState, useEffect, useRef } from 'react';
import { categories, getItemsByCategory, featuredItems } from '@/data/menu';
import type { MenuItem } from '@/types/menu';
import { useI18n } from '@/i18n/context';
import CategoryNav from './CategoryNav';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import NoodleBuilder from './NoodleBuilder';

const MenuSection = () => {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [noodleOpen, setNoodleOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    document.getElementById(`category-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenItem = (item: MenuItem) => {
    if (item.categoryId === 'noodles' && item.id === 'noodle-bowl') {
      setNoodleOpen(true);
    } else {
      setSelectedItem(item);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-category');
            if (id) setActiveCategory(id);
          }
        });
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );

    categories.forEach((cat) => {
      const el = document.getElementById(`category-${cat.id}`);
      if (el) {
        sectionRefs.current[cat.id] = el;
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div id="menu">
      <CategoryNav activeCategory={activeCategory} onSelect={handleCategorySelect} />

      {/* Featured / Best Sellers */}
      <section className="py-8 px-4 max-w-screen-xl mx-auto">
        <h2 className="text-2xl md:text-3xl tracking-tighter uppercase text-foreground mb-5">
          {t.menu.best_sellers}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {featuredItems.slice(0, 4).map((item) => (
            <ProductCard key={item.id} item={item} onOpen={handleOpenItem} />
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.map((cat) => {
        const items = getItemsByCategory(cat.id);
        const isPlatters = cat.id === 'platters';
        return (
          <section
            key={cat.id}
            id={`category-${cat.id}`}
            data-category={cat.id}
            className="py-6 px-4 max-w-screen-xl mx-auto scroll-mt-28"
          >
            <h2 className="text-xl md:text-2xl tracking-tighter uppercase text-foreground mb-1">
              {t.categories[cat.id as keyof typeof t.categories] || cat.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{cat.description}</p>
            <div className={`grid gap-3 ${
              isPlatters ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onOpen={handleOpenItem}
                  variant={isPlatters ? 'premium' : 'default'}
                />
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
