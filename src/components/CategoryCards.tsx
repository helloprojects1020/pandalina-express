import { useNavigate } from 'react-router-dom';
import { useMenu } from '@/hooks/useMenu';
import { useI18n } from '@/i18n/context';

const CategoryCards = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { categories } = useMenu();

  return (
    <section className="py-10 px-4 max-w-screen-xl mx-auto">
      <h2 className="text-2xl md:text-3xl tracking-tighter uppercase text-foreground mb-6">
        {t.categories.title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => navigate(`/category/${cat.slug}`)}
            className="group relative aspect-[4/3] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
          >
            <img
              src={cat.image}
              alt={t.categories[cat.id as keyof typeof t.categories] || cat.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-accent/80 to-transparent" />
            <div className="absolute bottom-0 start-0 end-0 p-3">
              <h3 className="font-display text-sm md:text-base tracking-tight text-accent-foreground">
                {t.categories[cat.id as keyof typeof t.categories] || cat.name}
              </h3>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryCards;
