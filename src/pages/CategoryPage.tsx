import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMenu } from '@/hooks/useMenu';
import type { MenuItem } from '@/types/menu';
import { useI18n } from '@/i18n/context';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import NoodleBuilder from '@/components/NoodleBuilder';
import Footer from '@/components/Footer';

const categoryVideos: Record<string, string> = {
  'sushi-rolls': '/videos/category-sushi.mp4',
  platters: '/videos/category-platters.mp4',
  kitchen: '/videos/category-kitchen.mp4',
  noodles: '/videos/category-noodles.mp4',
  drinks: '/videos/category-drinks.mp4',
};

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const { categories, getItemsByCategory } = useMenu();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [noodleOpen, setNoodleOpen] = useState(false);

  // גלול לראש הדף בכל כניסה לקטגוריה
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [slug]);

  const category = categories.find((c) => c.slug === slug);
  const videoSrc = slug ? categoryVideos[slug] : undefined;

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold text-foreground">קטגוריה לא נמצאה</h1>
        <Link to="/" className="text-primary underline text-sm">← חזרה לתפריט</Link>
      </div>
    );
  }

  const items = getItemsByCategory(category.slug);
  const isPlatters = category.slug === 'platters';
  const categoryLabel = t.categories[category.slug as keyof typeof t.categories] || category.name_he || category.name;

  const handleOpenItem = (item: MenuItem) => {
    if (item.slug === 'build-your-noodle-bowl') {
      setNoodleOpen(true);
    } else {
      setSelectedItem(item);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero banner */}
      <div className="relative h-56 md:h-72 overflow-hidden bg-black">
        {category.image && (
          <img
            src={category.image}
            alt={categoryLabel}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
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
        </div>
      </div>

      {/* Product grid */}
      <section className="py-8 px-4 max-w-screen-xl mx-auto">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">אין פריטים בקטגוריה זו</div>
        ) : (
          <div className={`grid gap-3 ${isPlatters ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onOpen={handleOpenItem}
                variant={isPlatters ? 'premium' : 'default'}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
      <ProductModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <NoodleBuilder open={noodleOpen} onClose={() => setNoodleOpen(false)} />
    </div>
  );
};

export default CategoryPage;