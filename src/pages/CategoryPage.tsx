import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { categories, getItemsByCategory } from '@/data/menu';
import type { MenuItem } from '@/types/menu';
import { useI18n } from '@/i18n/context';
import { localizedDescription } from '@/lib/localize';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import NoodleBuilder from '@/components/NoodleBuilder';
import Footer from '@/components/Footer';
const DRINKS_VIDEO_URL = '/__l5e/assets-v1/6bcd0d68-890f-47c6-899b-52635f97d65c/category-drinks.mp4';

/* Category-specific hero videos – locally hosted for reliability */
const categoryVideos: Record<string, string> = {
  'sushi-rolls': '/videos/category-sushi.mp4',
  platters: '/videos/category-platters.mp4',
  kitchen: '/videos/category-kitchen.mp4',
  noodles: '/videos/category-noodles.mp4',
  drinks: DRINKS_VIDEO_URL,
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useI18n();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [noodleOpen, setNoodleOpen] = useState(false);

  const category = categories.find((c) => c.slug === slug);

  const videoSrc = category ? categoryVideos[category.id] : undefined;

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-display text-foreground">Category not found</h1>
        <Link to="/" className="text-primary underline text-sm">
          ← Back to Home
        </Link>
      </div>
    );
  }

  const items = getItemsByCategory(category.id);
  const isPlatters = category.id === 'platters';
  const categoryLabel =
    t.categories[category.id as keyof typeof t.categories] || category.name;

  const handleOpenItem = (item: MenuItem) => {
    if (item.categoryId === 'noodles' && item.id === 'noodle-bowl') {
      setNoodleOpen(true);
    } else {
      setSelectedItem(item);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner with video */}
      <div className="relative h-56 md:h-72 overflow-hidden bg-black">
        {/* Category video — immediate, no fallback image */}
        {videoSrc && (
          <video
            src={videoSrc}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark overlay for readability */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.25), rgba(0,0,0,0.35))' }}
        />

        <div className="absolute bottom-0 start-0 end-0 p-4 md:p-8 max-w-screen-xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {t.header.menu}
          </Link>
          <h1 className="text-3xl md:text-4xl tracking-tighter uppercase text-primary-foreground">
            {categoryLabel}
          </h1>
          <p className="text-sm text-primary-foreground/60 mt-1">
            {localizedDescription(category, locale)}
          </p>
        </div>
      </div>

      {/* Product grid */}
      <section className="py-8 px-4 max-w-screen-xl mx-auto">
        <div
          className={`grid gap-3 ${
            isPlatters
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          }`}
        >
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

      <Footer />

      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <NoodleBuilder open={noodleOpen} onClose={() => setNoodleOpen(false)} />
    </div>
  );
};

export default CategoryPage;
