import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, UtensilsCrossed, List, SlidersHorizontal,
  ClipboardList, Bell, Settings, LogOut, Menu, Users, Truck,
  FileSpreadsheet, UserCog, Package, BarChart2, Calculator,
  TrendingUp, FileBarChart, ChevronDown, Store,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'he' | 'ar' | 'en' | 'ru';
interface Restaurant { id: string; name: string; slug: string; logo_url?: string | null; }

// ─── Translations ─────────────────────────────────────────────────────────────

const LANG_LABELS: Record<Lang, string> = { he: 'עב', ar: 'عر', en: 'EN', ru: 'RU' };

const NAV_LABELS: Record<string, Record<Lang, string>> = {
  Dashboard:               { he: 'דשבורד',          ar: 'لوحة التحكم',    en: 'Dashboard',        ru: 'Панель' },
  Categories:              { he: 'קטגוריות',         ar: 'الفئات',         en: 'Categories',       ru: 'Категории' },
  'Menu Items':            { he: 'פריטי תפריט',      ar: 'عناصر القائمة',  en: 'Menu Items',       ru: 'Блюда' },
  'Options / Modifiers':   { he: 'תוספות',           ar: 'الإضافات',       en: 'Options',          ru: 'Опции' },
  Orders:                  { he: 'הזמנות',           ar: 'الطلبات',        en: 'Orders',           ru: 'Заказы' },
  Customers:               { he: 'לקוחות',           ar: 'العملاء',        en: 'Customers',        ru: 'Клиенты' },
  'Delivery Zones':        { he: 'אזורי משלוח',      ar: 'مناطق التوصيل',  en: 'Delivery Zones',   ru: 'Зоны доставки' },
  Staff:                   { he: 'עובדים',           ar: 'الموظفون',       en: 'Staff',            ru: 'Сотрудники' },
  Inventory:               { he: 'מלאי',             ar: 'المخزون',        en: 'Inventory',        ru: 'Склад' },
  Analytics:               { he: 'אנליטיקס',         ar: 'التحليلات',      en: 'Analytics',        ru: 'Аналитика' },
  'Daily Report':          { he: 'דוח יומי',          ar: 'التقرير اليومي', en: 'Daily Report',     ru: 'Дневной отчёт' },
  'Report XZ':             { he: 'דוח X/Z',           ar: 'تقرير X/Z',      en: 'Report X/Z',       ru: 'Отчёт X/Z' },
  Reminders:               { he: 'תזכורות',           ar: 'التذكيرات',      en: 'Reminders',        ru: 'Напоминания' },
  'Menu Performance':      { he: 'ביצועי מנות',      ar: 'أداء القائمة',   en: 'Menu Performance', ru: 'Эффективность' },
  Costing:                 { he: 'עלויות ורווחיות',  ar: 'التكاليف',       en: 'Costing',          ru: 'Себестоимость' },
  'Export Reports':        { he: 'ייצוא דוחות',     ar: 'تصدير التقارير', en: 'Export Reports',   ru: 'Экспорт' },
  Settings:                { he: 'הגדרות',           ar: 'الإعدادات',      en: 'Settings',         ru: 'Настройки' },
  'Sign Out':              { he: 'התנתק',            ar: 'تسجيل الخروج',   en: 'Sign Out',         ru: 'Выйти' },
  'Restaurant Management': { he: 'ניהול מסעדה',     ar: 'إدارة المطعم',   en: 'Management',       ru: 'Управление' },
};

const tr = (key: string, lang: Lang) => NAV_LABELS[key]?.[lang] ?? key;

// ─── Nav items ────────────────────────────────────────────────────────────────

const navItems = [
  { to: '/admin',                  icon: LayoutDashboard,   label: 'Dashboard',           end: true },
  { to: '/admin/menu',             icon: UtensilsCrossed,   label: 'Categories',          end: true },
  { to: '/admin/menu/items',       icon: List,              label: 'Menu Items' },
  { to: '/admin/menu/options',     icon: SlidersHorizontal, label: 'Options / Modifiers' },
  { to: '/admin/orders',           icon: ClipboardList,     label: 'Orders' },
  { to: '/admin/customers',        icon: Users,             label: 'Customers' },
  { to: '/admin/delivery-zones',   icon: Truck,             label: 'Delivery Zones' },
  { to: '/admin/staff',            icon: UserCog,           label: 'Staff' },
  { to: '/admin/inventory',        icon: Package,           label: 'Inventory' },
  { to: '/admin/daily',            icon: ClipboardList,     label: 'Daily Report' },
  { to: '/admin/report-xz',        icon: FileBarChart,      label: 'Report XZ' },
  { to: '/admin/reminders',        icon: Bell,              label: 'Reminders' },
  { to: '/admin/analytics',        icon: BarChart2,         label: 'Analytics' },
  { to: '/admin/menu-performance', icon: TrendingUp,        label: 'Menu Performance' },
  { to: '/admin/costing',          icon: Calculator,        label: 'Costing' },
  { to: '/admin/export',           icon: FileSpreadsheet,   label: 'Export Reports' },
  { to: '/admin/settings',         icon: Settings,          label: 'Settings' },
];

// ─── StoreLogo helper ─────────────────────────────────────────────────────────

const LOGO_COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500'];

function StoreLogo({ restaurant, px = 32 }: { restaurant: Restaurant | undefined; px?: number }) {
  const [imgError, setImgError] = useState(false);
  if (restaurant?.logo_url && !imgError) {
    return (
      <img
        src={restaurant.logo_url}
        alt={restaurant.name}
        style={{ width: px, height: px }}
        className="rounded-lg object-cover shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  const initials = (restaurant?.name ?? 'B').slice(0, 2).toUpperCase();
  const colorIdx = (restaurant?.name?.charCodeAt(0) ?? 66) % LOGO_COLORS.length;
  return (
    <div
      style={{ width: px, height: px }}
      className={`rounded-lg ${LOGO_COLORS[colorIdx]} flex items-center justify-center shrink-0`}
    >
      <span className="text-white text-xs font-black">{initials}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const AdminLayout = () => {
  const { user, signOut, restaurantId, setRestaurantId } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [lang,         setLang]         = useState<Lang>(() => (localStorage.getItem('adminLang') as Lang) ?? 'he');
  const [restaurants,  setRestaurants]  = useState<Restaurant[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const currentRestaurant = restaurants.find(r => r.id === restaurantId);
  const isRTL = lang === 'he' || lang === 'ar';

  // ── Load restaurants for this user ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    db.from('restaurant_users')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(async ({ data: ruData }: { data: { restaurant_id: string }[] | null }) => {
        const ids = (ruData ?? []).map((r: { restaurant_id: string }) => r.restaurant_id);
        if (ids.length === 0) return;

        const { data: rData } = await db
          .from('restaurants')
          .select('id, name, slug, logo_url')
          .in('id', ids) as { data: Restaurant[] | null };

        const list: Restaurant[] = rData ?? [];
        setRestaurants(list);

        if (list.length > 0 && !list.find(r => r.id === restaurantId)) {
          setRestaurantId(list[0].id);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('adminLang', l);
  };

  const switchStore = (id: string) => {
    setRestaurantId(id);
    setSwitcherOpen(false);
    navigate('/admin');
    setTimeout(() => window.location.reload(), 80);
  };

  // ── Sidebar (JSX variable, NOT inner component — avoids remount on render) ──
  const sidebarJSX = (
    <div className="flex flex-col h-full">

      {/* ── Store Switcher ─────────────────────────────────────────────────── */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <button
            onClick={() => setSwitcherOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <StoreLogo restaurant={currentRestaurant} px={32} />
            <div className="flex-1 min-w-0 text-start">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {currentRestaurant?.name ?? 'Bitelyx'}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {restaurants.length > 1
                  ? (lang === 'he' ? 'לחץ להחלפת עסק' : lang === 'ar' ? 'اضغط للتبديل' : 'Switch store')
                  : (lang === 'he' ? 'העסק שלך' : 'Your store')}
              </p>
            </div>
            {restaurants.length > 1 && (
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>

          {/* Dropdown */}
          {switcherOpen && restaurants.length > 1 && (
            <div className="absolute top-full mt-1 right-0 left-0 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {restaurants.map(r => (
                <button
                  key={r.id}
                  onClick={() => switchStore(r.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted text-start ${
                    r.id === restaurantId ? 'bg-primary/10' : ''
                  }`}
                >
                  <StoreLogo restaurant={r} px={28} />
                  <span className={`text-xs font-semibold flex-1 truncate ${
                    r.id === restaurantId ? 'text-primary' : 'text-foreground'
                  }`}>
                    {r.name}
                  </span>
                  {r.id === restaurantId && (
                    <span className="text-[10px] text-primary font-bold shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language switcher */}
        <div className="flex gap-1 mt-2.5">
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => changeLang(l)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                lang === l
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{tr(label, lang)}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── User / Logout ─────────────────────────────────────────────────── */}
      <div className="p-3 border-t border-border space-y-1">
        <div className="flex items-center gap-2 px-3 py-1">
          <Store className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {tr('Sign Out', lang)}
        </button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-e border-border bg-card flex-col shrink-0 sticky top-0 h-screen">
        {sidebarJSX}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 bg-card shadow-2xl">
            {sidebarJSX}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {currentRestaurant && <StoreLogo restaurant={currentRestaurant} px={28} />}
            <h2 className="text-sm font-semibold text-foreground truncate">
              {currentRestaurant?.name ?? tr('Restaurant Management', lang)}
            </h2>
          </div>
          {restaurants.length > 1 && (
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full shrink-0">
              {restaurants.length} {lang === 'he' ? 'עסקים' : 'stores'}
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;