import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import {
  LayoutDashboard, UtensilsCrossed, List, SlidersHorizontal,
  ClipboardList, Bell, Settings, LogOut, Menu, Users, Truck,
  FileSpreadsheet, UserCog, Package, BarChart2, Calculator,
  TrendingUp, FileBarChart, ChevronDown, ChevronRight, Shield, Lock,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { FeatureKey } from '@/types/featureFlags';
import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Lang = 'he' | 'ar' | 'en' | 'ru';
interface Restaurant { id: string; name: string; slug: string; logo_url?: string | null; }

const LANG_LABELS: Record<Lang, string> = { he: 'עב', ar: 'عر', en: 'EN', ru: 'RU' };

const NAV_LABELS: Record<string, Record<Lang, string>> = {
  Dashboard:               { he: 'דשבורד',          ar: 'لوحة التحكم',    en: 'Dashboard',        ru: 'Панель' },
  Categories:              { he: 'קטגוריות',         ar: 'الفئات',         en: 'Categories',       ru: 'Категории' },
  'Menu Items':            { he: 'פריטי תפריט',      ar: 'عناصر القائمة',  en: 'Menu Items',       ru: 'Блюда' },
  'Options / Modifiers':   { he: 'תוספות ושינויים',  ar: 'الإضافات',       en: 'Options',          ru: 'Опции' },
  Orders:                  { he: 'הזמנות',           ar: 'الطلبات',        en: 'Orders',           ru: 'Заказы' },
  Customers:               { he: 'לקוחות',           ar: 'العملاء',        en: 'Customers',        ru: 'Клиенты' },
  'Delivery Zones':        { he: 'אזורי משלוח',      ar: 'مناطق التوصيل',  en: 'Delivery Zones',   ru: 'Зоны' },
  Staff:                   { he: 'עובדים',           ar: 'الموظفون',       en: 'Staff',            ru: 'Сотрудники' },
  Inventory:               { he: 'מלאי',             ar: 'المخزون',        en: 'Inventory',        ru: 'Склад' },
  Analytics:               { he: 'אנליטיקס',         ar: 'التحليلات',      en: 'Analytics',        ru: 'Аналитика' },
  'Daily Report':          { he: 'דוח יומי',          ar: 'التقرير اليومي', en: 'Daily Report',     ru: 'Дневной' },
  'Report XZ':             { he: 'דוח X/Z',           ar: 'تقرير X/Z',      en: 'Report X/Z',       ru: 'X/Z' },
  Reminders:               { he: 'תזכורות',           ar: 'التذكيرات',      en: 'Reminders',        ru: 'Напоминания' },
  'Menu Performance':      { he: 'ביצועי מנות',      ar: 'أداء القائمة',   en: 'Menu Performance', ru: 'Эффективность' },
  Costing:                 { he: 'עלויות ורווחיות',  ar: 'التكاليف',       en: 'Costing',          ru: 'Себестоимость' },
  'Export Reports':        { he: 'ייצוא דוחות',      ar: 'تصدير التقارير', en: 'Export Reports',   ru: 'Экспорт' },
  Settings:                { he: 'הגדרות',           ar: 'الإعدادات',      en: 'Settings',         ru: 'Настройки' },
  'Sign Out':              { he: 'התנתק',            ar: 'تسجيل الخروج',   en: 'Sign Out',         ru: 'Выйти' },
  // Section headers
  Operations:              { he: 'תפעול',            ar: 'العمليات',       en: 'Operations',       ru: 'Операции' },
  'Menu Management':       { he: 'ניהול תפריט',      ar: 'إدارة القائمة',  en: 'Menu',             ru: 'Меню' },
  'Team & Inventory':      { he: 'צוות ומלאי',       ar: 'الفريق والمخزون', en: 'Team & Stock',    ru: 'Команда' },
  'Reports & Insights':    { he: 'דוחות ותובנות',    ar: 'التقارير',       en: 'Reports',          ru: 'Отчёты' },
  Configuration:           { he: 'הגדרות מערכת',     ar: 'الإعدادات',      en: 'Settings',         ru: 'Настройки' },
};

const tr = (key: string, lang: Lang) => NAV_LABELS[key]?.[lang] ?? key;

// Nav grouped by section
// `feature` = FeatureKey | undefined — undefined means always visible (Free tier)
const NAV_SECTIONS = [
  {
    key: 'Operations',
    items: [
      { to: '/admin',                icon: LayoutDashboard,   label: 'Dashboard',          end: true,  feature: undefined },
      { to: '/admin/orders',         icon: ClipboardList,     label: 'Orders',                         feature: undefined },
      { to: '/admin/customers',      icon: Users,             label: 'Customers',                      feature: 'customers' as FeatureKey },
      { to: '/admin/delivery-zones', icon: Truck,             label: 'Delivery Zones',                 feature: 'delivery_zones' as FeatureKey },
    ],
  },
  {
    key: 'Menu Management',
    items: [
      { to: '/admin/menu',           icon: UtensilsCrossed,   label: 'Categories',         end: true,  feature: undefined },
      { to: '/admin/menu/items',     icon: List,              label: 'Menu Items',                     feature: undefined },
      { to: '/admin/menu/options',   icon: SlidersHorizontal, label: 'Options / Modifiers',            feature: undefined },
    ],
  },
  {
    key: 'Team & Inventory',
    items: [
      { to: '/admin/staff',          icon: UserCog,           label: 'Staff',                          feature: 'staff' as FeatureKey },
      { to: '/admin/inventory',      icon: Package,           label: 'Inventory',                      feature: 'inventory' as FeatureKey },
      { to: '/admin/reminders',      icon: Bell,              label: 'Reminders',                      feature: undefined },
    ],
  },
  {
    key: 'Reports & Insights',
    items: [
      { to: '/admin/daily',            icon: ClipboardList,   label: 'Daily Report',                   feature: 'daily' as FeatureKey },
      { to: '/admin/report-xz',        icon: FileBarChart,    label: 'Report XZ',                      feature: 'reports' as FeatureKey },
      { to: '/admin/analytics',        icon: BarChart2,       label: 'Analytics',                      feature: 'analytics' as FeatureKey },
      { to: '/admin/menu-performance', icon: TrendingUp,      label: 'Menu Performance',               feature: 'menu_performance' as FeatureKey },
      { to: '/admin/costing',          icon: Calculator,      label: 'Costing',                        feature: 'costing' as FeatureKey },
      { to: '/admin/export',           icon: FileSpreadsheet, label: 'Export Reports',                 feature: 'export' as FeatureKey },
    ],
  },
  {
    key: 'Configuration',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Settings', feature: undefined },
    ],
  },
];

// ─── StoreLogo ────────────────────────────────────────────────────────────────

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

// ─── Bitelyx wordmark ─────────────────────────────────────────────────────────

function BitelxWordmark() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/60">
      {/* Icon mark */}
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-primary-foreground text-sm font-black tracking-tight">B</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-foreground tracking-tight leading-none">BITELYX</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-none font-medium">Restaurant Platform</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

const AdminLayout = () => {
  const { user, signOut, restaurantId, setRestaurantId } = useAuth();
  const isSuperAdmin = user?.email
    ? SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()) || true // TODO: remove || true before prod
    : false;
  const navigate = useNavigate();

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [lang,         setLang]         = useState<Lang>(() => (localStorage.getItem('adminLang') as Lang) ?? 'he');
  const [restaurants,  setRestaurants]  = useState<Restaurant[]>([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const currentRestaurant = restaurants.find(r => r.id === restaurantId);
  const isRTL = lang === 'he' || lang === 'ar';
  const { hasFeature } = useFeatureFlags();

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

  const sidebarJSX = (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── BITELYX wordmark ─────────────────────────────────────────────── */}
      <BitelxWordmark />

      {/* ── Store Switcher ─────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 border-b border-border/60">
        <div className="relative">
          <button
            onClick={() => setSwitcherOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border/40 hover:border-border"
          >
            <StoreLogo restaurant={currentRestaurant} px={30} />
            <div className="flex-1 min-w-0 text-start">
              <p className="text-xs font-bold text-foreground truncate leading-tight">
                {currentRestaurant?.name ?? 'Bitelyx'}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {restaurants.length > 1
                  ? (lang === 'he' ? 'החלף עסק' : lang === 'ar' ? 'تبديل' : 'Switch store')
                  : (lang === 'he' ? 'העסק שלך' : 'Your store')}
              </p>
            </div>
            {restaurants.length > 1
              ? <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${switcherOpen ? 'rotate-180' : ''}`} />
              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
            }
          </button>

          {switcherOpen && restaurants.length > 1 && (
            <div className="absolute top-full mt-1 right-0 left-0 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {restaurants.map(r => (
                <button
                  key={r.id}
                  onClick={() => switchStore(r.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted text-start ${r.id === restaurantId ? 'bg-primary/10' : ''}`}
                >
                  <StoreLogo restaurant={r} px={26} />
                  <span className={`text-xs font-semibold flex-1 truncate ${r.id === restaurantId ? 'text-primary' : 'text-foreground'}`}>
                    {r.name}
                  </span>
                  {r.id === restaurantId && <span className="text-[10px] text-primary font-bold shrink-0">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language switcher */}
        <div className="flex gap-1 mt-2">
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => changeLang(l)}
              className={`flex-1 py-1 rounded-md text-[11px] font-bold transition-colors ${
                lang === l ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Nav (grouped) ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 py-2 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map(section => (
          <div key={section.key}>
            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2.5 mb-1 leading-none">
              {tr(section.key, lang)}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, end, feature }) => {
                const locked = feature ? !hasFeature(feature) : false;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : locked
                          ? 'text-muted-foreground/50 hover:bg-muted/50 hover:text-muted-foreground active:scale-[0.98]'
                          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-[0.98]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-[13px] flex-1">{tr(label, lang)}</span>
                    {locked && <Lock className="w-3 h-3 shrink-0 opacity-50" />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Super Admin ──────────────────────────────────────────────────── */}
      {isSuperAdmin && (
        <div className="px-2.5 pb-2 border-b border-border/60">
          <p className="text-[10px] font-bold text-purple-500/70 uppercase tracking-widest px-2.5 mb-1 leading-none">
            Super Admin
          </p>
          <NavLink
            to="/admin/platform"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-600 hover:bg-purple-500/10 active:scale-[0.98]'
              }`
            }
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span className="truncate text-[13px]">Platform Control</span>
          </NavLink>
        </div>
      )}

      {/* ── User / Logout ─────────────────────────────────────────────────── */}
      <div className="px-2.5 py-2.5 border-t border-border/60 space-y-0.5">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/40">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">{user?.email?.slice(0, 1).toUpperCase()}</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate flex-1">{user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {tr('Sign Out', lang)}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 border-e border-border bg-card flex-col shrink-0 sticky top-0 h-screen">
        {sidebarJSX}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-64 bg-card shadow-2xl">
            {sidebarJSX}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center px-4 gap-3 sticky top-0 z-40 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {/* Restaurant identity */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {currentRestaurant && <StoreLogo restaurant={currentRestaurant} px={26} />}
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-tight">
                {currentRestaurant?.name ?? 'Bitelyx'}
              </p>
              <p className="hidden md:block text-[10px] text-muted-foreground leading-tight">
                Powered by <span className="font-bold text-primary">BITELYX</span>
              </p>
            </div>
          </div>

          {/* Multi-store badge */}
          {restaurants.length > 1 && (
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full shrink-0 border border-primary/20">
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
