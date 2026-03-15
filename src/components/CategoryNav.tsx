import { useNavigate } from 'react-router-dom';
import { categories } from '@/data/menu';
import { useI18n } from '@/i18n/context';

interface CategoryNavProps {
  activeCategory: string;
  onSelect: (id: string) => void;
}

const CategoryNav = ({ activeCategory, onSelect }: CategoryNavProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleClick = (cat: (typeof categories)[0]) => {
    navigate(`/category/${cat.slug}`);
  };

  return (
    <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-screen-xl mx-auto">
        <nav className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleClick(cat)}
              className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {t.categories[cat.id as keyof typeof t.categories] || cat.name}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default CategoryNav;
