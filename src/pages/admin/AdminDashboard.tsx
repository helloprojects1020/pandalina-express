import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UtensilsCrossed, ClipboardList, Layers, Settings, TrendingUp, Clock, CheckCircle, XCircle, CreditCard, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type DashboardStats = {
  categories: number;
  items: number;
  ordersTotal: number;
  ordersToday: number;
  revenueToday: number;
  revenueTotal: number;
  ordersNew: number;
  ordersPreparing: number;
  ordersReady: number;
  ordersCompleted: number;
  ordersCancelled: number;
  paymentsPaidToday: number;
  paymentsPaidTotal: number;
  paymentsPending: number;
  paymentsFailed: number;
};

type OrderData = {
  id: string;
  status: string;
  total: number;
  payment_status: string | null;
};

type RecentOrder = {
  id: string;
  customer_name: string | null;
  total: number;
  status: string;
  order_type: string;
  created_at: string;
  payment_status: string | null;
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-700',
  preparing: 'bg-yellow-500/10 text-yellow-700',
  ready: 'bg-green-500/10 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  new: 'חדשה',
  preparing: 'בהכנה',
  ready: 'מוכנה',
  completed: 'הושלמה',
  cancelled: 'בוטלה',
};

const paymentStatusColors: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-700',
  pending: 'bg-yellow-500/10 text-yellow-700',
  failed: 'bg-destructive/10 text-destructive',
};

const paymentStatusLabels: Record<string, string> = {
  paid: '💳 שולם',
  pending: '⏳ ממתין',
  failed: '❌ נכשל',
};

const orderTypeLabels: Record<string, string> = {
  pickup: 'איסוף',
  delivery: 'משלוח',
  dine_in: 'שולחן',
};

const AdminDashboard = () => {
  const { restaurantId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    categories: 0, items: 0, ordersTotal: 0, ordersToday: 0,
    revenueToday: 0, revenueTotal: 0, ordersNew: 0, ordersPreparing: 0,
    ordersReady: 0, ordersCompleted: 0, ordersCancelled: 0,
    paymentsPaidToday: 0, paymentsPaidTotal: 0, paymentsPending: 0, paymentsFailed: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    const fetchStats = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const [cats, items, allOrders, todayOrders, allPayments, todayPayments, recent] = await Promise.all([
        db.from('categories').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        db.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        db.from('orders').select('status, total, payment_status').eq('restaurant_id', restaurantId),
        db.from('orders').select('status, total, payment_status').eq('restaurant_id', restaurantId).gte('created_at', todayISO),
        db.from('payments').select('status, amount').eq('restaurant_id', restaurantId),
        db.from('payments').select('status, amount').eq('restaurant_id', restaurantId).gte('created_at', todayISO),
        db.from('orders').select('id, customer_name, total, status, order_type, created_at, payment_status').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(5),
      ]);

      const allOrdersData: OrderData[] = allOrders.data ?? [];
      const todayOrdersData: OrderData[] = todayOrders.data ?? [];
      const allPaymentsData = allPayments.data ?? [];
      const todayPaymentsData = todayPayments.data ?? [];

      const revenueTotal = allOrdersData
        .filter(o => o.payment_status === 'paid' || o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.total ?? 0), 0);

      const revenueToday = todayOrdersData
        .filter(o => o.payment_status === 'paid' || o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.total ?? 0), 0);

      const paymentsPaidTotal = allPaymentsData
        .filter((p: { status: string }) => p.status === 'paid')
        .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount ?? 0), 0);

      const paymentsPaidToday = todayPaymentsData
        .filter((p: { status: string }) => p.status === 'paid')
        .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount ?? 0), 0);

      const paymentsPending = allPaymentsData.filter((p: { status: string }) => p.status === 'pending').length;
      const paymentsFailed = allPaymentsData.filter((p: { status: string }) => p.status === 'failed').length;
      const countByStatus = (status: string) => allOrdersData.filter(o => o.status === status).length;

      setStats({
        categories: cats.count ?? 0,
        items: items.count ?? 0,
        ordersTotal: allOrdersData.length,
        ordersToday: todayOrdersData.length,
        revenueToday, revenueTotal,
        ordersNew: countByStatus('new'),
        ordersPreparing: countByStatus('preparing'),
        ordersReady: countByStatus('ready'),
        ordersCompleted: countByStatus('completed'),
        ordersCancelled: countByStatus('cancelled'),
        paymentsPaidToday, paymentsPaidTotal, paymentsPending, paymentsFailed,
      });
      setRecentOrders(recent.data ?? []);
      setLoading(false);
    };
    fetchStats();
  }, [restaurantId]);

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-orange-500/10 text-orange-600"><ClipboardList className="w-5 h-5" /></div>
          <p className="text-2xl font-bold text-foreground">{stats.ordersToday}</p>
          <p className="text-sm text-muted-foreground">הזמנות היום</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-green-500/10 text-green-600"><TrendingUp className="w-5 h-5" /></div>
          <p className="text-2xl font-bold text-foreground">₪{stats.revenueToday}</p>
          <p className="text-sm text-muted-foreground">הכנסות היום</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-blue-500/10 text-blue-600"><ClipboardList className="w-5 h-5" /></div>
          <p className="text-2xl font-bold text-foreground">{stats.ordersTotal}</p>
          <p className="text-sm text-muted-foreground">סה"כ הזמנות</p>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-purple-500/10 text-purple-600"><TrendingUp className="w-5 h-5" /></div>
          <p className="text-2xl font-bold text-foreground">₪{stats.revenueTotal}</p>
          <p className="text-sm text-muted-foreground">סה"כ הכנסות</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">תשלומים אונליין</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl p-3 text-center bg-green-500/10 text-green-700">
            <p className="text-2xl font-bold">₪{stats.paymentsPaidToday}</p>
            <p className="text-xs mt-0.5">שולם היום</p>
          </div>
          <div className="rounded-xl p-3 text-center bg-green-500/10 text-green-700">
            <p className="text-2xl font-bold">₪{stats.paymentsPaidTotal}</p>
            <p className="text-xs mt-0.5">סה"כ שולם</p>
          </div>
          <div className="rounded-xl p-3 text-center bg-yellow-500/10 text-yellow-700">
            <p className="text-2xl font-bold">{stats.paymentsPending}</p>
            <p className="text-xs mt-0.5">ממתינים</p>
          </div>
          <div className="rounded-xl p-3 text-center bg-destructive/10 text-destructive">
            <p className="text-2xl font-bold">{stats.paymentsFailed}</p>
            <p className="text-xs mt-0.5">נכשלו</p>
          </div>
        </div>
        {stats.paymentsFailed > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            יש {stats.paymentsFailed} תשלום שנכשל — בדוק בהזמנות
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-foreground mb-4">סטטוס הזמנות</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'חדשות', value: stats.ordersNew, color: 'bg-blue-500/10 text-blue-700', icon: Clock },
            { label: 'בהכנה', value: stats.ordersPreparing, color: 'bg-yellow-500/10 text-yellow-700', icon: Clock },
            { label: 'מוכנות', value: stats.ordersReady, color: 'bg-green-500/10 text-green-700', icon: CheckCircle },
            { label: 'הושלמו', value: stats.ordersCompleted, color: 'bg-muted text-muted-foreground', icon: CheckCircle },
            { label: 'בוטלו', value: stats.ordersCancelled, color: 'bg-destructive/10 text-destructive', icon: XCircle },
          ].map(item => (
            <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'קטגוריות', value: stats.categories, icon: Layers, to: '/admin/menu', color: 'bg-blue-500/10 text-blue-600' },
          { label: 'מנות', value: stats.items, icon: UtensilsCrossed, to: '/admin/menu/items', color: 'bg-green-500/10 text-green-600' },
          { label: 'הזמנות', value: stats.ordersTotal, icon: ClipboardList, to: '/admin/orders', color: 'bg-orange-500/10 text-orange-600' },
          { label: 'הגדרות', value: '←', icon: Settings, to: '/admin/settings', color: 'bg-purple-500/10 text-purple-600' },
        ].map((c) => (
          <Link key={c.label} to={c.to} className="bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">הזמנות אחרונות</h2>
          <Link to="/admin/orders" className="text-xs text-primary">כל ההזמנות ←</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין הזמנות עדיין</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                  {order.payment_status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${paymentStatusColors[order.payment_status] ?? ''}`}>
                      {paymentStatusLabels[order.payment_status]}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.customer_name ?? 'אורח'}</p>
                    <p className="text-xs text-muted-foreground">{orderTypeLabels[order.order_type]} · {fmtTime(order.created_at)}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground">₪{order.total}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;