import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, ShoppingBag, Users, Repeat, GitCompare } from 'lucide-react';
import { DateRangePicker, DateRange } from '@/components/admin/DateRangePicker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Period = '7' | '30' | '90';
type Order = { id: string; created_at: string; total: number; subtotal: number; status: string; order_type: string; customer_phone: string | null; };
type OrderItem = { menu_item_name: string; quantity: number; line_total: number; };

function fmtCurrency(n: number) { return `₪${Math.round(n).toLocaleString('he-IL')}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }); }

function getPeriodStart(period: Period): string {
  const d = new Date(); d.setDate(d.getDate() - Number(period)); return d.toISOString();
}
function getPrevPeriodStart(period: Period): string {
  const d = new Date(); d.setDate(d.getDate() - Number(period) * 2); return d.toISOString();
}

const PERIOD_LABELS: Record<Period, string> = { '7': '7 ימים', '30': '30 ימים', '90': '90 ימים' };

// קיצורי חודשים להשוואה
function getMonthRange(monthsAgo: number): { from: string; to: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59);
  const label = start.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  return { from: start.toISOString(), to: end.toISOString(), label };
}

const BarChart = ({ data, valueKey, labelKey, color = 'bg-primary' }: { data: Record<string, number | string>[]; valueKey: string; labelKey: string; color?: string; }) => {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
            <div className={`w-full ${color} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity`}
              style={{ height: `${Math.max((Number(d[valueKey]) / max) * 100, 2)}%` }}
              title={`${d[labelKey]}: ${d[valueKey]}`} />
          </div>
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
};

const KpiCard = ({ title, value, sub, icon: Icon, trend }: { title: string; value: string; sub?: string; icon: React.ElementType; trend?: number; }) => (
  <div className="bg-card rounded-xl p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs text-muted-foreground">{title}</p>
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    {trend !== undefined && (
      <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend >= 0 ? '+' : ''}{trend.toFixed(1)}% לעומת תקופה קודמת
      </div>
    )}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-2xl p-5 shadow-sm space-y-4">
    <h3 className="font-semibold text-foreground text-sm">{title}</h3>
    {children}
  </div>
);

const AdminAnalytics = () => {
  const { restaurantId } = useAuth();
  const [period, setPeriod] = useState<Period>('30');
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prevOrders, setPrevOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // השוואת תקופות
  const [compareMode, setCompareMode] = useState(false);
  const [compareDateRange, setCompareDateRange] = useState<DateRange>(null);
  const [compareOrders, setCompareOrders] = useState<Order[]>([]);
  const [compareLabel, setCompareLabel] = useState('תקופה להשוואה');

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    const start = dateRange ? new Date(dateRange.from).toISOString() : getPeriodStart(period);
    const end = dateRange ? new Date(dateRange.to + 'T23:59:59').toISOString() : new Date().toISOString();
    const prevStart = getPrevPeriodStart(period);

    Promise.all([
      db.from('orders').select('id, created_at, total, subtotal, status, order_type, customer_phone')
        .eq('restaurant_id', restaurantId).neq('status', 'cancelled')
        .gte('created_at', start).lte('created_at', end).order('created_at'),
      db.from('orders').select('id, total')
        .eq('restaurant_id', restaurantId).neq('status', 'cancelled')
        .gte('created_at', prevStart).lt('created_at', start),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(async ([ordersRes, prevRes]: any[]) => {
      const currentOrders = ordersRes.data ?? [];
      setOrders(currentOrders);
      setPrevOrders(prevRes.data ?? []);
      const orderIds = currentOrders.map((o: Order) => o.id);
      if (orderIds.length > 0) {
        const { data: itemsData } = await db.from('order_items').select('menu_item_name, quantity, line_total').in('order_id', orderIds);
        setOrderItems(itemsData ?? []);
      } else { setOrderItems([]); }
      setLoading(false);
    });
  }, [restaurantId, period, dateRange]);

  // טעינת תקופת השוואה
  useEffect(() => {
    if (!restaurantId || !compareMode || !compareDateRange) return;
    db.from('orders').select('id, created_at, total, status, order_type, customer_phone')
      .eq('restaurant_id', restaurantId).neq('status', 'cancelled')
      .gte('created_at', new Date(compareDateRange.from).toISOString())
      .lte('created_at', new Date(compareDateRange.to + 'T23:59:59').toISOString())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] }) => setCompareOrders(data ?? []));
  }, [restaurantId, compareMode, compareDateRange]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total), 0);
    const revenueTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersTrend = prevOrders.length > 0 ? ((orders.length - prevOrders.length) / prevOrders.length) * 100 : 0;
    const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;
    const prevAvg = prevOrders.length > 0 ? prevOrders.reduce((s, o) => s + Number(o.total), 0) / prevOrders.length : 0;
    const avgTrend = prevAvg > 0 ? ((avgOrder - prevAvg) / prevAvg) * 100 : 0;
    const phones = orders.map(o => o.customer_phone).filter(Boolean);
    const allPhones = new Set(phones);
    const phoneCounts: Record<string, number> = {};
    phones.forEach(p => { if (p) phoneCounts[p] = (phoneCounts[p] || 0) + 1; });
    const returning = Object.values(phoneCounts).filter(c => c > 1).length;
    const newCustomers = allPhones.size - returning;
    return { totalRevenue, revenueTrend, ordersTrend, avgOrder, avgTrend, returning, newCustomers, total: orders.length };
  }, [orders, prevOrders]);

  const compareStats = useMemo(() => {
    const rev = compareOrders.reduce((s, o) => s + Number(o.total), 0);
    const avg = compareOrders.length > 0 ? rev / compareOrders.length : 0;
    return { revenue: rev, total: compareOrders.length, avg };
  }, [compareOrders]);

  const dailyRevenue = useMemo(() => {
    const byDay: Record<string, number> = {};
    orders.forEach(o => { const day = fmtDate(o.created_at); byDay[day] = (byDay[day] || 0) + Number(o.total); });
    return Object.entries(byDay).slice(-14).map(([label, value]) => ({ label, value: Math.round(value) }));
  }, [orders]);

  const compareDaily = useMemo(() => {
    if (!compareMode || !compareOrders.length) return [];
    const byDay: Record<string, number> = {};
    compareOrders.forEach(o => { const day = fmtDate(o.created_at); byDay[day] = (byDay[day] || 0) + Number(o.total); });
    return Object.entries(byDay).slice(-14).map(([label, value]) => ({ label, value: Math.round(value) }));
  }, [compareOrders, compareMode]);

  const peakHours = useMemo(() => {
    const byHour: Record<number, number> = {};
    orders.forEach(o => { const h = new Date(o.created_at).getHours(); byHour[h] = (byHour[h] || 0) + 1; });
    return Array.from({ length: 24 }, (_, h) => ({ label: `${h}`, value: byHour[h] || 0 })).filter(h => h.value > 0);
  }, [orders]);

  const orderTypes = useMemo(() => {
    const counts: Record<string, number> = { delivery: 0, pickup: 0, dine_in: 0 };
    orders.forEach(o => { if (o.order_type in counts) counts[o.order_type]++; });
    const total = orders.length || 1;
    return [
      { label: 'משלוח', value: counts.delivery, pct: Math.round((counts.delivery / total) * 100), color: 'bg-blue-500' },
      { label: 'איסוף', value: counts.pickup, pct: Math.round((counts.pickup / total) * 100), color: 'bg-green-500' },
      { label: 'שולחן', value: counts.dine_in, pct: Math.round((counts.dine_in / total) * 100), color: 'bg-purple-500' },
    ];
  }, [orders]);

  const popularItems = useMemo(() => {
    const byItem: Record<string, { qty: number; revenue: number }> = {};
    orderItems.forEach(i => {
      if (!byItem[i.menu_item_name]) byItem[i.menu_item_name] = { qty: 0, revenue: 0 };
      byItem[i.menu_item_name].qty += Number(i.quantity);
      byItem[i.menu_item_name].revenue += Number(i.line_total);
    });
    return Object.entries(byItem).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8).map(([name, data]) => ({ name, ...data }));
  }, [orderItems]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const maxItemQty = Math.max(...popularItems.map(i => i.qty), 1);
  const prevRevenueTotal = prevOrders.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">נתוני ביצועים לתקופה שנבחרה</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={r => { setDateRange(r); }} />
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
          <Button variant={compareMode ? 'default' : 'outline'} size="sm" onClick={() => setCompareMode(v => !v)}>
            <GitCompare className="w-4 h-4 ml-1" />השווה
          </Button>
        </div>
      </div>

      {/* Compare panel */}
      {compareMode && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">📊 השוואת תקופות</p>
          <div className="flex gap-2 flex-wrap items-center">
            <DateRangePicker value={compareDateRange} onChange={r => { setCompareDateRange(r); if (r) setCompareLabel(`${new Date(r.from).toLocaleDateString('he-IL')} — ${new Date(r.to).toLocaleDateString('he-IL')}`); }} />
            {/* קיצורים מהירים */}
            {[0, 1, 2, 3].map(i => {
              const m = getMonthRange(i + 1);
              return (
                <button key={i} onClick={() => { setCompareDateRange({ from: m.from.split('T')[0], to: m.to.split('T')[0] }); setCompareLabel(m.label); }}
                  className="text-xs bg-card border border-border px-2 py-1 rounded-lg hover:bg-muted">
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* תוצאות השוואה */}
          {compareDateRange && compareOrders.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { label: 'הכנסות', current: stats.totalRevenue, compare: compareStats.revenue, fmt: fmtCurrency },
                { label: 'הזמנות', current: stats.total, compare: compareStats.total, fmt: (n: number) => String(n) },
                { label: 'ממוצע', current: stats.avgOrder, compare: compareStats.avg, fmt: fmtCurrency },
              ].map(item => {
                const diff = item.compare > 0 ? ((item.current - item.compare) / item.compare) * 100 : 0;
                const up = diff >= 0;
                return (
                  <div key={item.label} className="bg-card rounded-xl p-3 text-center shadow-sm">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-bold text-foreground mt-1">{item.fmt(item.current)}</p>
                    <p className="text-xs text-muted-foreground">vs {item.fmt(item.compare)}</p>
                    <p className={`text-xs font-bold mt-1 ${up ? 'text-green-600' : 'text-red-600'}`}>
                      {up ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">{compareLabel}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* גרף השוואה */}
          {compareDateRange && compareDaily.length > 0 && dailyRevenue.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">גרף הכנסות — השוואה</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-center text-primary mb-1">תקופה נוכחית</p>
                  <BarChart data={dailyRevenue} valueKey="value" labelKey="label" color="bg-primary" />
                </div>
                <div>
                  <p className="text-xs text-center text-muted-foreground mb-1">{compareLabel}</p>
                  <BarChart data={compareDaily} valueKey="value" labelKey="label" color="bg-muted-foreground/40" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="הכנסות" value={fmtCurrency(stats.totalRevenue)} icon={TrendingUp} trend={stats.revenueTrend} />
        <KpiCard title="הזמנות" value={String(stats.total)} sub={`ממוצע ${fmtCurrency(stats.avgOrder)}`} icon={ShoppingBag} trend={stats.ordersTrend} />
        <KpiCard title="לקוחות חוזרים" value={String(stats.returning)} sub={`${stats.newCustomers} חדשים`} icon={Repeat} />
        <KpiCard title="סה״כ לקוחות" value={String(stats.returning + stats.newCustomers)} icon={Users} />
      </div>

      {/* גרף הכנסות */}
      {dailyRevenue.length > 0 && (
        <Section title="📈 הכנסות יומיות">
          <BarChart data={dailyRevenue} valueKey="value" labelKey="label" color="bg-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>סה"כ: {fmtCurrency(stats.totalRevenue)}</span>
            <span>ממוצע יומי: {fmtCurrency(stats.totalRevenue / (dailyRevenue.length || 1))}</span>
          </div>
        </Section>
      )}

      {/* שעות עומס */}
      {peakHours.length > 0 && (
        <Section title="⏰ שעות עומס">
          <BarChart data={peakHours} valueKey="value" labelKey="label" color="bg-orange-400" />
          <p className="text-xs text-muted-foreground">
            שעת השיא: {peakHours.reduce((a, b) => a.value > b.value ? a : b).label}:00
            ({peakHours.reduce((a, b) => a.value > b.value ? a : b).value} הזמנות)
          </p>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="🍽️ סוגי הזמנות">
          <div className="space-y-3">
            {orderTypes.map(type => (
              <div key={type.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{type.label}</span>
                  <span className="text-muted-foreground">{type.value} ({type.pct}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${type.color} rounded-full`} style={{ width: `${type.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="👥 לקוחות חוזרים vs חדשים">
          <div className="space-y-3">
            {[
              { label: 'חוזרים', value: stats.returning, color: 'bg-green-500' },
              { label: 'חדשים', value: stats.newCustomers, color: 'bg-blue-500' },
            ].map(item => {
              const pct = Math.round((item.value / (stats.returning + stats.newCustomers || 1)) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{item.value} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">שיעור שימור לקוחות</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {Math.round((stats.returning / (stats.returning + stats.newCustomers || 1)) * 100)}%
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* מנות פופולריות */}
      {popularItems.length > 0 && (
        <Section title="🔥 מנות פופולריות">
          <div className="space-y-2">
            {popularItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-sm text-foreground truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 mr-2">{item.qty} יח׳ · {fmtCurrency(item.revenue)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(item.qty / maxItemQty) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* השוואה לתקופה קודמת */}
      <Section title="📊 השוואה לתקופה הקודמת (אוטומטי)">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'הכנסות', current: stats.totalRevenue, prev: prevRevenueTotal, fmt: fmtCurrency },
            { label: 'הזמנות', current: stats.total, prev: prevOrders.length, fmt: (n: number) => String(n) },
            { label: 'ממוצע', current: stats.avgOrder, prev: prevOrders.length > 0 ? prevRevenueTotal / prevOrders.length : 0, fmt: fmtCurrency },
          ].map(item => {
            const diff = item.prev > 0 ? ((item.current - item.prev) / item.prev) * 100 : 0;
            const up = diff >= 0;
            return (
              <div key={item.label} className="bg-muted/30 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{item.fmt(item.current)}</p>
                <p className="text-xs text-muted-foreground">לעומת {item.fmt(item.prev)}</p>
                <p className={`text-xs font-medium mt-1 ${up ? 'text-green-600' : 'text-red-600'}`}>
                  {up ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </Section>

    </div>
  );
};

export default AdminAnalytics;