import { categories } from '@/data/menu';

interface CategoryNavProps {
  activeCategory: string;
  onSelect: (id: string) => void;
}

const CategoryNav = ({ activeCategory, onSelect }: CategoryNavProps) => {
  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-screen-xl mx-auto">
        <nav className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default CategoryNav;
