import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  UtensilsCrossed, ClipboardList, Layers, Settings, TrendingUp,
  Clock, CheckCircle, XCircle, RefreshCw,
  Calendar, ArrowUpRight, Zap, Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, KpiCard, SectionCard, StatusBadge, EmptyState, LoadingState } from '@/components/admin/AdminUI';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type OrderRow = { id: string; status: string; total: number; payment_status: string | null; order_type: string; customer_name: string | null; created_at: string; subtotal: number; };
type RecentOrder = { id: string; customer_name: string | null; total: number; status: string; order_type: string; created_at: string; payment_status: string | null; };
type PopularItem = { name: string; count: number; revenue: number; };
type DayRevenue = { date: string; label: string; revenue: number; orders: number; };
type HourStat = { hour: number; label: string; orders: number; };


const AdminDashboard = () => {
  const { restaurantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [categoriesCount, setCategoriesCount] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ new: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<DayRevenue[]>([]);
  const [hourStats, setHourStats] = useState<HourStat[]>([]);
  const [periodRevenue, setPeriodRevenue] = useState(0);
  const [periodOrders, setPeriodOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);

  const fetchStats = useCallback(async () => {
    if (!restaurantId) return;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const periodStart = new Date(now);
    if (period === 'week') periodStart.setDate(now.getDate() - 7);
    else periodStart.setDate(now.getDate() - 30);

    const [catsRes, itemsRes, allOrdersRes, todayOrdersRes, recentRes, periodOrdersRes, orderItemsRes] = await Promise.all([
      db.from('categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      db.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
      db.from('orders').select('status, total, payment_status, created_at, order_type, subtotal').eq('restaurant_id', restaurantId),
      db.from('orders').select('status, total, payment_status').eq('restaurant_id', restaurantId).gte('created_at', todayStart.toISOString()),
      db.from('orders').select('id, customer_name, total, status, order_type, created_at, payment_status').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(6),
      db.from('orders').select('total, status, created_at, subtotal').eq('restaurant_id', restaurantId).gte('created_at', periodStart.toISOString()),
      db.from('order_items').select('menu_item_name, unit_price').eq('restaurant_id', restaurantId).gte('created_at', periodStart.toISOString()),
    ]);

    const allOrders: OrderRow[] = allOrdersRes.data ?? [];
    const todayOrds: OrderRow[] = todayOrdersRes.data ?? [];
    const periodOrds: OrderRow[] = periodOrdersRes.data ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItems: any[] = orderItemsRes.data ?? [];

    const todayRev = todayOrds.filter(o => o.status === 'completed' || o.payment_status === 'paid').reduce((s, o) => s + Number(o.total ?? 0), 0);
    const totalRev = allOrders.filter(o => o.status === 'completed' || o.payment_status === 'paid').reduce((s, o) => s + Number(o.total ?? 0), 0);
    const counts = { new: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
    allOrders.forEach(o => { if (o.status in counts) counts[o.status as keyof typeof counts]++; });
    const periodRev = periodOrds.filter(o => o.status === 'completed' || o.payment_status === 'paid').reduce((s, o) => s + Number(o.total ?? 0), 0);
    const avgVal = periodOrds.length > 0 ? periodRev / periodOrds.length : 0;

    const days = period === 'week' ? 7 : 30;
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      dayMap.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
    }
    periodOrds.forEach(o => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (dayMap.has(key)) {
        const e = dayMap.get(key)!;
        if (o.status === 'completed' || o.payment_status === 'paid') e.revenue += Number(o.total ?? 0);
        e.orders++;
      }
    });
    const revByDay: DayRevenue[] = Array.from(dayMap.entries()).map(([date, val]) => ({
      date, label: new Date(date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }), ...val,
    }));

    const hourMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) hourMap.set(h, 0);
    allOrders.forEach(o => { const h = new Date(o.created_at).getHours(); hourMap.set(h, (hourMap.get(h) ?? 0) + 1); });
    const hourArr: HourStat[] = Array.from(hourMap.entries()).map(([hour, orders]) => ({ hour, label: `${hour}:00`, orders })).filter(h => h.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 6);

    const itemMap = new Map<string, { count: number; revenue: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderItems.forEach((i: any) => {
      const name = i.menu_item_name ?? 'לא ידוע';
      const e = itemMap.get(name) ?? { count: 0, revenue: 0 };
      e.count++; e.revenue += Number(i.unit_price ?? 0);
      itemMap.set(name, e);
    });
    const popular: PopularItem[] = Array.from(itemMap.entries()).map(([name, val]) => ({ name, ...val })).sort((a, b) => b.count - a.count).slice(0, 5);

    setCategoriesCount(catsRes.count ?? 0);
    setItemsCount(itemsRes.count ?? 0);
    setOrdersToday(todayOrds.length);
    setRevenueToday(todayRev);
    setOrdersTotal(allOrders.length);
    setRevenueTotal(totalRev);
    setStatusCounts(counts);
    setRecentOrders(recentRes.data ?? []);
    setPopularItems(popular);
    setRevenueByDay(revByDay);
    setHourStats(hourArr);
    setPeriodRevenue(periodRev);
    setPeriodOrders(periodOrds.length);
    setAvgOrderValue(avgVal);
    setLastRefresh(new Date());
    setLoading(false);
  }, [restaurantId, period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase.channel(`dashboard-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchStats())
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); setIsLive(false); };
  }, [restaurantId, fetchStats]);

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const fmtCurrency = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;
  const maxRevenue = Math.max(...revenueByDay.map(d => d.revenue), 1);
  const maxOrders = Math.max(...hourStats.map(h => h.orders), 1);

  if (loading) return <LoadingState />;

  const activeOrders = statusCounts.new + statusCounts.preparing + statusCounts.ready;

  return (
    <div className="space-y-5" dir="rtl">

      <PageHeader
        title="לוח בקרה"
        description={`עדכון אחרון: ${fmtTime(lastRefresh.toISOString())}`}
        isLive={isLive}
        actions={
          <>
            <Select value={period} onValueChange={v => setPeriod(v as 'week' | 'month')}>
              <SelectTrigger className="h-8 text-xs w-36 bg-muted/40 border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 ימים אחרונים</SelectItem>
                <SelectItem value="month">30 ימים אחרונים</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground transition-all">
              <RefreshCw className="w-3.5 h-3.5" />רענן
            </button>
          </>
        }
      />

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="הכנסות היום" value={fmtCurrency(revenueToday)} sub={`${ordersToday} הזמנות`} accent="#10b981" icon={TrendingUp} href="/admin/orders" />
        <KpiCard label="הכנסות תקופה" value={fmtCurrency(periodRevenue)} sub={`${periodOrders} הזמנות`} accent="#3b82f6" icon={Calendar} href="/admin/analytics" />
        <KpiCard label="ממוצע הזמנה" value={fmtCurrency(avgOrderValue)} sub="בתקופה" accent="#8b5cf6" icon={Zap} href="/admin/analytics" />
        <KpiCard
          label="הזמנות פעילות"
          value={activeOrders}
          sub={`${statusCounts.new} ממתינות`}
          accent={activeOrders > 0 ? '#f59e0b' : '#6b7280'}
          icon={ClipboardList}
          href="/admin/orders"
        />
      </div>

      {/* Alert bar */}
      {statusCounts.new > 0 && (
        <Link to="/admin/orders"
          className="flex items-center justify-between px-4 py-3 bg-amber-500/8 border border-amber-400/30 rounded-xl hover:bg-amber-500/12 transition-all">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="text-sm font-semibold text-amber-700">{statusCounts.new} הזמנות חדשות ממתינות לטיפול</span>
          </div>
          <span className="text-xs font-bold text-amber-700 flex items-center gap-1 shrink-0">טפל עכשיו <ArrowUpRight className="w-3.5 h-3.5" /></span>
        </Link>
      )}

      {/* Revenue Chart */}
      <SectionCard
        title="הכנסות לפי יום"
        description={`סה"כ: ${fmtCurrency(periodRevenue)}`}
        icon={TrendingUp}
        action={<span className="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg">{period === 'week' ? '7 ימים' : '30 ימים'}</span>}
      >
        {revenueByDay.every(d => d.revenue === 0) ? (
          <EmptyState title="אין נתונים לתקופה זו" />
        ) : (
          <div className="flex items-end gap-[3px] h-28 overflow-x-auto">
            {revenueByDay.map(day => {
              const height = Math.max((day.revenue / maxRevenue) * 96, day.revenue > 0 ? 4 : 0);
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={day.date} className="flex flex-col items-center gap-1 flex-1 min-w-[20px] group/bar cursor-default">
                  <div className="relative w-full flex justify-center">
                    {day.revenue > 0 && (
                      <div className="absolute -top-5 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-foreground text-background text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap z-10">
                        {fmtCurrency(day.revenue)}
                      </div>
                    )}
                  </div>
                  <div className="w-full flex items-end justify-center" style={{ height: '96px' }}>
                    <div className={`w-full rounded-t-sm transition-all duration-300 ${isToday ? 'bg-primary' : 'bg-primary/35 group-hover/bar:bg-primary/65'}`}
                      style={{ height: `${height}px` }} />
                  </div>
                  <p className={`text-[9px] ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{day.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Status + Popular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="סטטוס הזמנות" icon={ClipboardList}>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {([
              { key: 'new',       label: 'חדשות',   accent: '#3b82f6' },
              { key: 'preparing', label: 'בהכנה',   accent: '#f59e0b' },
              { key: 'ready',     label: 'מוכנות',  accent: '#10b981' },
              { key: 'completed', label: 'הושלמו',  accent: '#64748b' },
              { key: 'cancelled', label: 'בוטלו',   accent: '#ef4444' },
            ] as { key: string; label: string; accent: string }[]).map(({ key, label, accent }) => (
              <div key={key} className="rounded-xl p-2.5 text-center border border-border/50"
                style={{ background: `${accent}10` }}>
                <p className="text-lg font-black" style={{ color: accent }}>
                  {statusCounts[key as keyof typeof statusCounts]}
                </p>
                <p className="text-[10px] font-semibold mt-0.5 text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          {/* Peak hours */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">שעות שיא</p>
            {hourStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">אין נתונים</p>
            ) : (
              <div className="space-y-2">
                {hourStats.slice(0, 4).map(h => (
                  <div key={h.hour} className="flex items-center gap-2.5">
                    <span className="text-[11px] font-mono text-muted-foreground w-10 shrink-0">{h.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(h.orders / maxOrders) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{h.orders}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="מנות פופולריות"
          icon={UtensilsCrossed}
          action={
            <Link to="/admin/costing" className="text-[11px] text-primary flex items-center gap-0.5 hover:underline">
              ניתוח <ArrowUpRight className="w-3 h-3" />
            </Link>
          }
        >
          {popularItems.length === 0 ? (
            <EmptyState title="אין נתונים לתקופה זו" />
          ) : (
            <div className="space-y-3">
              {popularItems.map((item, idx) => {
                const rankColors = ['#f59e0b', '#94a3b8', '#f97316'];
                const pct = Math.round((item.count / (popularItems[0]?.count || 1)) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-black w-5 text-center shrink-0" style={{ color: rankColors[idx] ?? '#6b7280' }}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0 mr-2">{item.count}×</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: rankColors[idx] ?? '#6b7280' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent Orders */}
      <SectionCard
        title="הזמנות אחרונות"
        icon={ClipboardList}
        action={
          <Link to="/admin/orders" className="text-[11px] text-primary flex items-center gap-0.5 hover:underline">
            כל ההזמנות <ArrowUpRight className="w-3 h-3" />
          </Link>
        }
        noPadding
      >
        {recentOrders.length === 0 ? (
          <EmptyState title="אין הזמנות עדיין" description="הזמנות יופיעו כאן ברגע שיגיעו" />
        ) : (
          <div className="divide-y divide-border/40">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                <StatusBadge status={order.status} type="order" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{order.customer_name ?? 'אורח'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {order.order_type === 'delivery' ? 'משלוח' : order.order_type === 'pickup' ? 'איסוף' : 'שולחן'} · {fmtTime(order.created_at)}
                  </p>
                </div>
                <p className="text-sm font-black text-foreground shrink-0">{fmtCurrency(order.total)}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="קטגוריות" value={categoriesCount} icon={Layers} accent="#3b82f6" href="/admin/menu" />
        <KpiCard label="מנות בתפריט" value={itemsCount} icon={UtensilsCrossed} accent="#10b981" href="/admin/menu/items" />
        <KpiCard label="מלאי" value="ניהול" icon={Package} accent="#f59e0b" href="/admin/inventory" />
        <KpiCard label="הגדרות" value="מערכת" icon={Settings} accent="#8b5cf6" href="/admin/settings" />
      </div>

    </div>
  );
};

export default AdminDashboard;