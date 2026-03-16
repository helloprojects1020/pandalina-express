import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { featuredItems, getItemsByCategory } from '@/data/menu';
import type { MenuItem } from '@/types/menu';
import { useI18n } from '@/i18n/context';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import NoodleBuilder from './NoodleBuilder';

/** Standalone Best Sellers grid for the homepage */
export const BestSellers = () => {
  const { t } = useI18n();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  return (
    <section className="py-8 px-4 max-w-screen-xl mx-auto">
      <h2 className="text-2xl md:text-3xl tracking-tighter uppercase text-foreground mb-5">
        {t.menu.best_sellers}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {featuredItems.slice(0, 4).map((item) => (
          <ProductCard key={item.id} item={item} onOpen={setSelectedItem} />
        ))}
      </div>
      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </section>
  );
};

/** Platters preview for the homepage */
export const PlattersPreview = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const items = getItemsByCategory('platters');
  const preview = items.slice(0, 2);

  return (
    <section className="py-6 px-4 max-w-screen-xl mx-auto">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl tracking-tighter uppercase text-foreground mb-1">
            {t.categories.platters}
          </h2>
          <p className="text-sm text-muted-foreground">{t.categories.platters_desc || 'Sharing trays & party platters'}</p>
        </div>
        <button
          onClick={() => navigate('/category/platters')}
          className="text-primary text-sm font-semibold hover:underline flex-shrink-0"
        >
          {(t.categories as Record<string, string>).view_all || 'View All →'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {preview.map((item) => (
          <ProductCard key={item.id} item={item} onOpen={setSelectedItem} variant="premium" />
        ))}
      </div>
      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </section>
  );
};
