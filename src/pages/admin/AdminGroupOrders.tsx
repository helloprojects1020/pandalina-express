/**
 * AdminGroupOrders — Analytics + list for all group orders
 *
 * Route: /admin/group-orders
 *
 * KPIs:
 *   - Total group orders | Completed | Open | Abandoned
 *   - Avg participants | Avg order value | Total revenue
 *   - Payment breakdown: online paid / cash pending / unpaid
 *
 * Table: recent group orders with payment status at a glance.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  PageHeader, KpiCard, SectionCard, LoadingState, EmptyState,
} from '@/components/admin/AdminUI';
import {
  Users, CheckCircle2, TrendingUp, Banknote, CreditCard,
  AlertCircle, Clock, ArrowLeft, BarChart2,
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

type AnalyticsRow = {
  total_orders: number;
  completed_orders: number;
  open_orders: number;
  abandoned_orders: number;
  avg_participants: number;
  avg_order_value: number;
  total_revenue: number;
  paid_online: number;
  cash_participants: number;
  unpaid_participants: number;
  total_unpaid_amount: number;
};

type GroupOrderRow = {
  id: string;
  title: string | null;
  host_name: string;
  status: string;
  payment_mode: string;
  grand_total: number;
  participant_count: number;
  item_count: number;
  paid_count: number;
  cash_count: number;
  unpaid_count: number;
  paid_total: number;
  unpaid_total: number;
  created_at: string;
  submitted_at: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number)   { return `₪${Number(n).toFixed(2)}`; }
function fmtK(n: number)  { return n >= 1000 ? `₪${(n / 1000).toFixed(1)}K` : fmt(n); }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function completionRate(total: number, completed: number) {
  if (!total) return '—';
  return `${Math.round((completed / total) * 100)}%`;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'פתוחה', locked: 'נעולה', submitted: 'נשלחה', cancelled: 'בוטלה', expired: 'פגה',
};
const STATUS_CLS: Record<string, string> = {
  open:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  locked:    'bg-amber-100 text-amber-700 border-amber-200',
  submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  expired:   'bg-muted/40 text-muted-foreground border-border',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminGroupOrders() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsRow | null>(null);
  const [orders,    setOrders]    = useState<GroupOrderRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<'all' | 'open' | 'submitted' | 'other'>('all');

  // ── Fetch restaurant_id from auth context ───────────────────────────────
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return;
      const { data: rest } = await db
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (rest?.id) setRestaurantId(rest.id);
    })();
  }, []);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [analyticsRes, listRes] = await Promise.all([
        db.from('group_orders_analytics').select('*').eq('restaurant_id', restaurantId).maybeSingle(),
        db.from('group_orders_list').select('*').eq('restaurant_id', restaurantId).limit(100),
      ]);
      setAnalytics(analyticsRes.data ?? null);
      setOrders(listRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'open')      return o.status === 'open' || o.status === 'locked';
    if (filter === 'submitted') return o.status === 'submitted';
    return o.status === 'cancelled' || o.status === 'expired';
  });

  // ── Loading / empty states ──────────────────────────────────────────────
  if (loading) return <LoadingState />;

  const a = analytics;

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="הזמנות קבוצתיות"
        description="אנליטיקס ומעקב אחר כל ההזמנות הקבוצתיות"
        icon={<Users className="w-5 h-5" />}
      />

      {/* ── KPI grid ──────────────────────────────────────────────────────── */}
      {a && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            title="סה״כ הזמנות"
            value={String(a.total_orders ?? 0)}
            icon={<BarChart2 className="w-4 h-4" />}
          />
          <KpiCard
            title="הושלמו"
            value={`${a.completed_orders ?? 0} (${completionRate(a.total_orders, a.completed_orders)})`}
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <KpiCard
            title="משתתפים ממוצע"
            value={String(a.avg_participants ?? '—')}
            icon={<Users className="w-4 h-4" />}
          />
          <KpiCard
            title="ממוצע להזמנה"
            value={fmtK(a.avg_order_value ?? 0)}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>
      )}

      {/* ── Payment breakdown ──────────────────────────────────────────────── */}
      {a && (
        <SectionCard title="מצב תשלומים">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">סה״כ הכנסות</p>
              <p className="text-xl font-black text-emerald-600">{fmtK(a.total_revenue ?? 0)}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-1"><CreditCard className="w-4 h-4 text-blue-500" /></div>
              <p className="text-xs text-muted-foreground mb-1">שילמו אונליין</p>
              <p className="text-xl font-black text-blue-600">{a.paid_online ?? 0}</p>
              <p className="text-[10px] text-blue-500/70">משתתפים</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-1"><Banknote className="w-4 h-4 text-amber-500" /></div>
              <p className="text-xs text-muted-foreground mb-1">סימנו מזומן</p>
              <p className="text-xl font-black text-amber-600">{a.cash_participants ?? 0}</p>
              <p className="text-[10px] text-amber-500/70">משתתפים</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-1"><AlertCircle className="w-4 h-4 text-red-500" /></div>
              <p className="text-xs text-muted-foreground mb-1">לא שולם</p>
              <p className="text-xl font-black text-red-600">{fmtK(a.total_unpaid_amount ?? 0)}</p>
              <p className="text-[10px] text-red-500/70">סכום כולל</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Orders list ──────────────────────────────────────────────────── */}
      <SectionCard title="רשימת הזמנות">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            { key: 'all',       label: 'הכל' },
            { key: 'open',      label: 'פתוחות / נעולות' },
            { key: 'submitted', label: 'נשלחו' },
            { key: 'other',     label: 'בוטלו / פגו' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                filter === tab.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border/50 text-muted-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState title="אין הזמנות" description="לא נמצאו הזמנות קבוצתיות בטווח זה" />
        ) : (
          <div className="space-y-2">
            {filteredOrders.map(order => {
              const unpaidCount = order.unpaid_count ?? 0;

              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/admin/group-orders/${order.id}`)}
                  className="w-full text-right bg-card border border-border/50 rounded-2xl p-4 hover:border-border hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold truncate">
                          {order.title ?? 'הזמנה קבוצתית'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-px rounded-full border ${STATUS_CLS[order.status] ?? ''}`}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        מארח: {order.host_name} · {order.participant_count} משתתפים · {order.item_count} פריטים
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {order.paid_count > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-px rounded-full font-semibold">
                            {order.paid_count} שילמו ✓
                          </span>
                        )}
                        {order.cash_count > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-px rounded-full font-semibold">
                            {order.cash_count} מזומן
                          </span>
                        )}
                        {unpaidCount > 0 && (
                          <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-px rounded-full font-semibold">
                            {unpaidCount} לא שילמו
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: amount + time */}
                    <div className="text-left shrink-0 space-y-1">
                      <p className="text-base font-black">{fmt(order.grand_total)}</p>
                      {order.unpaid_total > 0 && (
                        <p className="text-xs text-red-600 font-semibold">
                          {fmt(order.unpaid_total)} לא שולם
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground justify-end">
                        <Clock className="w-2.5 h-2.5" />
                        {fmtDate(order.submitted_at ?? order.created_at)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
