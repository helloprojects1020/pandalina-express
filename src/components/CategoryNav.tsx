import { useNavigate } from 'react-router-dom';
import { useMenu } from '@/hooks/useMenu';
import { useI18n } from '@/i18n/context';

interface CategoryNavProps {
  activeCategory: string;
  onSelect: (id: string) => void;
}

const CategoryNav = ({ activeCategory, onSelect }: CategoryNavProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { categories } = useMenu();

  const handleClick = (cat: (typeof categories)[0]) => {
    onSelect(cat.id);
    const el = document.getElementById(`category-${cat.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
