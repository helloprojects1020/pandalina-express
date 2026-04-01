import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, TrendingDown, Flame, Snowflake, AlertTriangle } from 'lucide-react';
import { FeatureGate } from '@/components/admin/FeatureGate';
import { PageHeader, KpiCard, SectionCard, LoadingState, EmptyState } from '@/components/admin/AdminUI';
import { DateRangePicker, DateRange } from '@/components/admin/DateRangePicker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Period = '7' | '30' | '90' | 'all';
type SortBy = 'qty' | 'revenue' | 'avg_price' | 'name';
type FilterBy = 'all' | 'hot' | 'cold' | 'unsold';

const PERIOD_LABELS: Record<Period, string> = { '7': '7 ימים', '30': '30 ימים', '90': '90 ימים', 'all': 'הכל' };

function fmtCurrency(n: number) { return `₪${Math.round(n).toLocaleString('he-IL')}`; }

function getPeriodStart(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(period));
  return d.toISOString();
}

type DishStat = {
  name: string;
  qty: number;
  revenue: number;
  avg_price: number;
  orders_count: number;
};

type MenuItem = {
  id: string;
  name: string;
  name_he: string | null;
  price: number;
};

const AdminMenuPerformance = () => {
  const { restaurantId } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<{ menu_item_name: string; quantity: number; line_total: number; order_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30');
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('qty');
  const [filterBy, setFilterBy] = useState<FilterBy>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);

    const start = dateRange ? new Date(dateRange.from).toISOString() : getPeriodStart(period);
    const end = dateRange ? new Date(dateRange.to + 'T23:59:59').toISOString() : new Date().toISOString();

    let ordersQuery = db.from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled')
      .gte('created_at', start)
      .lte('created_at', end);
    if (!dateRange && !start) ordersQuery = db.from('orders').select('id').eq('restaurant_id', restaurantId).neq('status', 'cancelled');

    Promise.all([
      db.from('menu_items').select('id, name, name_he, price, category_id').eq('restaurant_id', restaurantId).eq('is_active', true),
      db.from('categories').select('id, name').eq('restaurant_id', restaurantId),
      ordersQuery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(async ([menuRes, catRes, ordersRes]: any[]) => {
      setMenuItems(menuRes.data ?? []);
      setCategories(catRes.data ?? []);

      const orderIds = (ordersRes.data ?? []).map((o: { id: string }) => o.id);
      if (orderIds.length > 0) {
        const { data: itemsData } = await db.from('order_items')
          .select('menu_item_name, quantity, line_total, order_id')
          .in('order_id', orderIds);
        setOrderItems(itemsData ?? []);
      } else {
        setOrderItems([]);
      }
      setLoading(false);
    });
  }, [restaurantId, period, dateRange]);

  // ─── חישוב ביצועים לכל מנה ───────────────────────────────────────────────
  const dishStats = useMemo((): DishStat[] => {
    const byName: Record<string, { qty: number; revenue: number; orders: Set<string> }> = {};

    orderItems.forEach(item => {
      const name = item.menu_item_name;
      if (!byName[name]) byName[name] = { qty: 0, revenue: 0, orders: new Set() };
      byName[name].qty += Number(item.quantity);
      byName[name].revenue += Number(item.line_total);
      byName[name].orders.add(item.order_id);
    });

    // הוסף מנות שלא נמכרו
    menuItems.forEach(m => {
      const displayName = m.name_he ?? m.name;
      if (!byName[displayName]) {
        byName[displayName] = { qty: 0, revenue: 0, orders: new Set() };
      }
    });

    return Object.entries(byName).map(([name, data]) => ({
      name,
      qty: data.qty,
      revenue: data.revenue,
      avg_price: data.qty > 0 ? data.revenue / data.qty : 0,
      orders_count: data.orders.size,
    }));
  }, [orderItems, menuItems]);

  // ─── threshold לחם/קר ────────────────────────────────────────────────────
  const avgQty = useMemo(() => {
    const sold = dishStats.filter(d => d.qty > 0);
    if (!sold.length) return 0;
    return sold.reduce((s, d) => s + d.qty, 0) / sold.length;
  }, [dishStats]);

  const getDishStatus = (qty: number): { label: string; color: string; icon: React.ElementType } => {
    if (qty === 0) return { label: 'לא נמכר', color: 'bg-gray-500/10 text-gray-600 border-gray-200', icon: AlertTriangle };
    if (qty >= avgQty * 1.5) return { label: 'חם', color: 'bg-red-500/10 text-red-700 border-red-200', icon: Flame };
    if (qty <= avgQty * 0.3) return { label: 'קר', color: 'bg-blue-500/10 text-blue-700 border-blue-200', icon: Snowflake };
    return { label: 'תקין', color: 'bg-green-500/10 text-green-700 border-green-200', icon: TrendingUp };
  };

  // ─── סינון ומיון ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...dishStats];

    // חיפוש
    if (search) result = result.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

    // פילטר סטטוס
    if (filterBy === 'hot') result = result.filter(d => d.qty >= avgQty * 1.5);
    else if (filterBy === 'cold') result = result.filter(d => d.qty > 0 && d.qty <= avgQty * 0.3);
    else if (filterBy === 'unsold') result = result.filter(d => d.qty === 0);

    // מיון
    result.sort((a, b) => {
      if (sortBy === 'qty') return b.qty - a.qty;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'avg_price') return b.avg_price - a.avg_price;
      return a.name.localeCompare(b.name, 'he');
    });

    return result;
  }, [dishStats, search, filterBy, sortBy, avgQty]);

  // ─── סיכום ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalQty = dishStats.reduce((s, d) => s + d.qty, 0);
    const totalRevenue = dishStats.reduce((s, d) => s + d.revenue, 0);
    const hotCount = dishStats.filter(d => d.qty >= avgQty * 1.5).length;
    const coldCount = dishStats.filter(d => d.qty > 0 && d.qty <= avgQty * 0.3).length;
    const unsoldCount = dishStats.filter(d => d.qty === 0).length;
    const topDish = dishStats.reduce((a, b) => a.qty > b.qty ? a : b, { name: '', qty: 0, revenue: 0, avg_price: 0, orders_count: 0 });
    return { totalQty, totalRevenue, hotCount, coldCount, unsoldCount, topDish };
  }, [dishStats, avgQty]);

  if (loading) return <LoadingState />;

  const maxQty = Math.max(...filtered.map(d => d.qty), 1);
  const maxRevenue = Math.max(...filtered.map(d => d.revenue), 1);

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <PageHeader
        title="ביצועי תפריט"
        description={`${dishStats.length} מנות · ${summary.totalQty} מכירות`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            {!dateRange && (
              <Select value={period} onValueChange={v => setPeriod(v as Period)}>
                <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label='סה"כ מנות שנמכרו' value={summary.totalQty} icon={TrendingUp} accent="#10b981" />
        <KpiCard label="הכנסה ממנות" value={fmtCurrency(summary.totalRevenue)} icon={TrendingUp} accent="#3b82f6" />
        <KpiCard label="מנות חמות" value={summary.hotCount} icon={Flame} accent="#ef4444" />
        <KpiCard label="לא נמכרו" value={summary.unsoldCount} icon={AlertTriangle} accent="#6b7280" />
      </div>

      {/* התראות */}
      {summary.unsoldCount > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="font-semibold text-sm text-yellow-700">{summary.unsoldCount} מנות לא נמכרו בתקופה זו</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dishStats.filter(d => d.qty === 0).map(d => (
              <span key={d.name} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{d.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* פילטרים */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש מנה..." className="pr-9 h-9" />
        </div>
        <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="qty">מיון: כמות</SelectItem>
            <SelectItem value="revenue">מיון: הכנסה</SelectItem>
            <SelectItem value="avg_price">מיון: מחיר ממוצע</SelectItem>
            <SelectItem value="name">מיון: שם</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBy} onValueChange={v => setFilterBy(v as FilterBy)}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המנות</SelectItem>
            <SelectItem value="hot">🔥 חמות בלבד</SelectItem>
            <SelectItem value="cold">❄️ קרות בלבד</SelectItem>
            <SelectItem value="unsold">לא נמכרו</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* טבלת מנות */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="אין מנות" description="אין מנות לפי הסינון הנבחר." />
        ) : filtered.map((dish, i) => {
          const status = getDishStatus(dish.qty);
          const StatusIcon = status.icon;
          const pctQty = (dish.qty / maxQty) * 100;
          const pctRevenue = (dish.revenue / maxRevenue) * 100;

          return (
            <div key={dish.name} className="bg-card rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {/* מספר */}
                <span className="text-sm font-bold text-muted-foreground w-6 shrink-0 text-center">{i + 1}</span>

                {/* שם + badge */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm truncate">{dish.name}</p>
                    <Badge variant="outline" className={`text-xs shrink-0 ${status.color}`}>
                      <StatusIcon className="w-3 h-3 ml-1" />
                      {status.label}
                    </Badge>
                  </div>

                  {/* progress bars */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-12 shrink-0">כמות</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pctQty}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-12 text-left shrink-0">{dish.qty} יח׳</span>
                    </div>
                    {dish.revenue > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-12 shrink-0">הכנסה</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pctRevenue}%` }} />
                        </div>
                        <span className="text-xs font-medium text-green-700 w-12 text-left shrink-0">{fmtCurrency(dish.revenue)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* נתונים */}
                <div className="text-left shrink-0 space-y-0.5">
                  {dish.avg_price > 0 && (
                    <p className="text-xs text-muted-foreground">מחיר ממוצע: {fmtCurrency(dish.avg_price)}</p>
                  )}
                  {dish.orders_count > 0 && (
                    <p className="text-xs text-muted-foreground">{dish.orders_count} הזמנות</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* סיכום תחתון */}
      {summary.topDish.qty > 0 && (
        <SectionCard title="סיכום תקופה" icon={TrendingUp}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">מנה מובילה</p>
              <p className="text-sm font-bold text-foreground mt-1 truncate">{summary.topDish.name}</p>
              <p className="text-xs text-primary">{summary.topDish.qty} יח׳</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">ממוצע מכירות למנה</p>
              <p className="text-2xl font-bold text-foreground mt-1">{Math.round(avgQty)}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">הכנסה ממוצעת למנה</p>
              <p className="text-sm font-bold text-foreground mt-1">
                {fmtCurrency(summary.totalRevenue / (dishStats.filter(d => d.qty > 0).length || 1))}
              </p>
            </div>
          </div>
        </SectionCard>
      )}

    </div>
  );
};

function GatedAdminMenuPerformance() {
  return <FeatureGate feature="menu_performance"><AdminMenuPerformance /></FeatureGate>;
}
export default GatedAdminMenuPerformance;