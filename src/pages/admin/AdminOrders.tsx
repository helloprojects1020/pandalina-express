import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Eye, ChefHat, CheckCircle, CreditCard, Volume2, VolumeX, MapPin, Phone, FileText, Package, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DateRangePicker, DateRange } from '@/components/admin/DateRangePicker';
import { PageHeader, StatusBadge, EmptyState, LoadingState, FilterPills, GroupLabel, ActionButton } from '@/components/admin/AdminUI';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const ORDER_TYPE_LABELS: Record<string, string> = { pickup: 'איסוף עצמי', delivery: 'משלוח', dine_in: 'ישיבה במקום' };
const STATUS_LABELS: Record<string, string> = { new: 'חדשה', preparing: 'בהכנה', ready: 'מוכנה', completed: 'הושלמה', cancelled: 'בוטלה' };
const STATUS_STRIP: Record<string, string> = {
  new: 'bg-blue-500', preparing: 'bg-amber-500', ready: 'bg-emerald-500',
  completed: 'bg-slate-300', cancelled: 'bg-red-400/60',
};
const CARD_BORDER: Record<string, string> = {
  new: 'border-blue-200 bg-blue-500/[0.015]',
  preparing: 'border-amber-200/60',
  ready: 'border-emerald-200/60',
  completed: 'border-border/40',
  cancelled: 'border-border/30 opacity-70',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate()-1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function groupOrders(orders: OrderRow[]): { label: string; orders: OrderRow[] }[] {
  const today = todayStr(); const yesterday = yesterdayStr();
  const groups: Record<string, OrderRow[]> = {};
  for (const o of orders) {
    const day = o.created_at.slice(0,10);
    const key = day === today ? 'היום' : day === yesterday ? 'אתמול' : day;
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  }
  return Object.entries(groups).map(([label, orders]) => ({ label, orders }));
}

function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode); gainNode.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
      gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration + 0.1);
    };
    playTone(880, 0, 0.15, 0.4); playTone(1100, 0.2, 0.15, 0.4); playTone(1320, 0.4, 0.25, 0.5);
  } catch (e) { console.warn('Sound error:', e); }
}

function openWaze(order: OrderRow) {
  if (order.latitude && order.longitude) {
    window.open(`https://waze.com/ul?ll=${order.latitude},${order.longitude}&navigate=yes`, '_blank');
  } else if (order.address) {
    window.open(`https://waze.com/ul?q=${encodeURIComponent(order.address)}&navigate=yes`, '_blank');
  }
}

type OrderRow = {
  id: string; customer_name: string | null; customer_phone: string | null;
  address: string | null; order_type: 'pickup' | 'delivery' | 'dine_in';
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  subtotal: number; delivery_fee: number; total: number;
  notes: string | null; created_at: string; payment_status: string | null;
  latitude: number | null; longitude: number | null;
};
type OrderItemRow = { id: string; menu_item_name: string; quantity: number; unit_price: number; };
type OrderItemOptionRow = { id: string; order_item_id: string; option_group_name: string; option_item_name: string; option_price: number; };
type PaymentRow = { id: string; status: string; provider: string; amount: number; provider_payment_id: string | null; paid_at: string | null; created_at: string; };

const WazeIcon = () => (
  <svg viewBox="0 0 64 64" className="w-4 h-4" fill="none">
    <circle cx="32" cy="32" r="32" fill="#05C8F7"/>
    <path d="M32 12C21 12 12 21 12 32c0 7 4 13 10 17l10 7 10-7c6-4 10-10 10-17 0-11-9-20-20-20z" fill="white"/>
    <circle cx="32" cy="30" r="7" fill="#05C8F7"/>
    <circle cx="26" cy="40" r="2.5" fill="#333"/>
    <circle cx="38" cy="40" r="2.5" fill="#333"/>
  </svg>
);

type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
const allStatuses: OrderStatus[] = ['new', 'preparing', 'ready', 'completed', 'cancelled'];

type GroupOrderRow = {
  id: string;
  title: string | null;
  host_name: string;
  host_phone: string | null;
  status: string;
  payment_mode: string;
  created_at: string;
  participant_count?: number;
  grand_total?: number;
};

const GROUP_STATUS_LABELS: Record<string, string> = {
  open: 'פתוחה', locked: 'נעולה', submitted: 'נשלחה', cancelled: 'בוטלה', expired: 'פגה תוקף',
};
const GROUP_STATUS_STYLE: Record<string, string> = {
  open:      'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  locked:    'bg-amber-500/15 text-amber-700 border-amber-200',
  submitted: 'bg-blue-500/15 text-blue-700 border-blue-200',
  cancelled: 'bg-red-500/15 text-red-600 border-red-200',
  expired:   'bg-muted/40 text-muted-foreground border-border',
};

const AdminOrders = () => {
  const { restaurantId } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupOrders, setGroupOrders] = useState<GroupOrderRow[]>([]);
  const [groupOrdersLoading, setGroupOrdersLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [dateRange, setDateRange] = useState<DateRange>(null);
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItemRow[]>([]);
  const [detailOptions, setDetailOptions] = useState<OrderItemOptionRow[]>([]);
  const [detailPayment, setDetailPayment] = useState<PaymentRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    let q = db.from('orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });

    if (filterStatus === 'active') q = q.in('status', ['new', 'preparing', 'ready']);
    else if (filterStatus !== 'all') q = q.eq('status', filterStatus);

    // date range filter
    if (dateRange) {
      q = q.gte('created_at', new Date(dateRange.from).toISOString())
           .lte('created_at', new Date(dateRange.to + 'T23:59:59').toISOString());
    }

    const { data } = await q;
    setOrders((data as OrderRow[]) ?? []);
    setLoading(false);
  }, [restaurantId, filterStatus, dateRange]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const fetchGroupOrders = useCallback(async () => {
    if (!restaurantId) return;
    setGroupOrdersLoading(true);
    const { data: goData } = await db
      .from('group_orders')
      .select('id, title, host_name, host_phone, status, payment_mode, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(20);

    const rows = (goData ?? []) as GroupOrderRow[];

    // Enrich with participant count + grand total
    const enriched = await Promise.all(rows.map(async (go) => {
      const { data: participants } = await db
        .from('group_order_participants')
        .select('id, subtotal')
        .eq('group_order_id', go.id);
      const pList = (participants ?? []) as { id: string; subtotal: number }[];
      return {
        ...go,
        participant_count: pList.length,
        grand_total: pList.reduce((s, p) => s + Number(p.subtotal), 0),
      };
    }));

    setGroupOrders(enriched);
    setGroupOrdersLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchGroupOrders(); }, [fetchGroupOrders]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase.channel(`orders-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as OrderRow;
            const isActive = ['new', 'preparing', 'ready'].includes(newOrder.status);
            const matchesFilter = filterStatus === 'all' || (filterStatus === 'active' && isActive) || filterStatus === newOrder.status;
            if (matchesFilter && !dateRange) setOrders(prev => [newOrder, ...prev]);
            if (soundEnabledRef.current) playOrderSound();
            toast({ title: `🔔 הזמנה חדשה!`, description: `${newOrder.customer_name ?? 'אורח'} · ${orderTypeLabels[newOrder.order_type] ?? newOrder.order_type} · ₪${newOrder.total}` });
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new as OrderRow } : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        })
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(channel); setIsLive(false); };
  }, [restaurantId, filterStatus, dateRange]);

  const openDetail = async (order: OrderRow) => {
    setDetailOrder(order); setDetailPayment(null); setDetailLoading(true);
    const { data: itemsData } = await db.from('order_items').select('*').eq('order_id', order.id);
    const items = (itemsData as OrderItemRow[]) ?? [];
    setDetailItems(items);
    if (items.length > 0) {
      const { data: optionsData } = await db.from('order_item_options').select('*').in('order_item_id', items.map(i => i.id));
      setDetailOptions((optionsData as OrderItemOptionRow[]) ?? []);
    } else { setDetailOptions([]); }
    const { data: paymentData } = await db.from('payments').select('*').eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setDetailPayment(paymentData ?? null);
    setDetailLoading(false);
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    await db.from('orders').update({ status }).eq('id', orderId);
    toast({ title: `סטטוס עודכן ל-${statusLabels[status]}` });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (detailOrder?.id === orderId) setDetailOrder(prev => prev ? { ...prev, status } : null);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const statusCounts = {
    active: orders.filter(o => ['new','preparing','ready'].includes(o.status)).length,
    all: orders.length,
    new: orders.filter(o => o.status === 'new').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // When filter is active, only show active orders; otherwise use filterStatus
  const displayedOrders = filterStatus === 'active'
    ? orders.filter(o => ['new','preparing','ready'].includes(o.status))
    : filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const groups = groupOrders(displayedOrders);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        title="הזמנות"
        description={`${displayedOrders.length} הזמנות`}
        isLive={isLive}
        actions={
          <>
            <DateRangePicker value={dateRange} onChange={r => setDateRange(r)} />
            <ActionButton
              icon={soundEnabled ? Volume2 : VolumeX}
              label={soundEnabled ? 'צליל' : 'מושתק'}
              onClick={() => setSoundEnabled(v => !v)}
              variant={soundEnabled ? 'outline' : 'ghost'}
            />
            <ActionButton label="רענן" onClick={fetchOrders} />
          </>
        }
      />

      {/* Status filter pills */}
      <FilterPills
        value={filterStatus}
        onChange={setFilterStatus}
        options={[
          { key: 'active', label: 'פעילות', count: statusCounts.active },
          { key: 'all', label: 'הכל', count: statusCounts.all },
          ...allStatuses.map(s => ({
            key: s,
            label: STATUS_LABELS[s],
            count: statusCounts[s as keyof typeof statusCounts] ?? 0,
            highlight: s === 'new' && (statusCounts.new > 0),
          })),
        ]}
      />

      {/* Date range indicator */}
      {dateRange && (
        <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-xl px-3 py-2">
          <span className="text-xs text-primary font-semibold">
            {new Date(dateRange.from).toLocaleDateString('he-IL')} — {new Date(dateRange.to).toLocaleDateString('he-IL')}
          </span>
          <span className="text-xs text-muted-foreground">· {displayedOrders.length} הזמנות</span>
          <button onClick={() => setDateRange(null)} className="mr-auto text-xs text-muted-foreground hover:text-foreground transition-colors">נקה</button>
        </div>
      )}

      {/* Orders — grouped */}
      {displayedOrders.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm">
          <EmptyState
            icon={Package}
            title="אין הזמנות להצגה"
            description={dateRange ? 'אין הזמנות בטווח התאריכים הנבחר' : 'בחר פילטר אחר או המתן להזמנה חדשה'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ label, orders: groupOrders }) => (
            <div key={label} className="space-y-2">
              <GroupLabel>{label} · {groupOrders.length} הזמנות</GroupLabel>
              {groupOrders.map(order => (
                <div key={order.id}
                  className={`bg-card border rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3 transition-all hover:shadow-md ${CARD_BORDER[order.status] ?? 'border-border/50'}`}>
                  {/* Coloured status strip */}
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${STATUS_STRIP[order.status] ?? 'bg-muted'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={order.status} type="order" />
                      <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                        {ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}
                      </span>
                      {order.payment_status && ['paid','pending','failed'].includes(order.payment_status) && (
                        <StatusBadge status={order.payment_status} type="payment" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-1.5 leading-snug">{order.customer_name ?? 'אורח'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.customer_phone ?? '—'} · {fmtDate(order.created_at)}
                    </p>
                  </div>

                  <p className="text-base font-black text-foreground shrink-0">₪{order.total}</p>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {order.order_type === 'delivery' && (order.address || order.latitude) && (
                      <button onClick={() => openWaze(order)}
                        className="w-8 h-8 rounded-xl bg-[#05C8F7]/10 border border-[#05C8F7]/30 flex items-center justify-center hover:bg-[#05C8F7]/20 transition-colors"
                        title="נווט ב-Waze">
                        <WazeIcon />
                      </button>
                    )}
                    {order.status === 'new' && (
                      <Button size="sm" className="h-8 text-xs gap-1" onClick={() => updateStatus(order.id, 'preparing')}>
                        <ChefHat className="w-3.5 h-3.5" />התחל
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => updateStatus(order.id, 'ready')}>
                        <CheckCircle className="w-3.5 h-3.5" />מוכן
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus(order.id, 'completed')}>
                        הושלם
                      </Button>
                    )}
                    <button onClick={() => openDetail(order)}
                      className="w-8 h-8 rounded-xl bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Group Orders Section ── */}
      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">הזמנות קבוצתיות</h2>
            {groupOrders.length > 0 && (
              <span className="text-xs bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">{groupOrders.length}</span>
            )}
          </div>
          <ActionButton label="רענן" onClick={fetchGroupOrders} />
        </div>

        {groupOrdersLoading ? (
          <div className="flex items-center justify-center py-8 bg-card border border-border/50 rounded-2xl">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : groupOrders.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl">
            <EmptyState icon={Users} title="אין הזמנות קבוצתיות" description="הזמנות קבוצתיות יופיעו כאן לאחר שייווצרו" />
          </div>
        ) : (
          <div className="space-y-2">
            {groupOrders.map(go => (
              <div
                key={go.id}
                className="bg-card border border-border/50 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/admin/group-orders/${go.id}`)}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${GROUP_STATUS_STYLE[go.status] ?? 'bg-muted/40 text-muted-foreground border-border'}`}>
                      {GROUP_STATUS_LABELS[go.status] ?? go.status}
                    </span>
                    <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                      {go.payment_mode === 'split' ? 'כל אחד משלם' : 'המארח משלם'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-1 leading-snug">
                    {go.title ?? 'הזמנה קבוצתית'} · {go.host_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {go.participant_count ?? 0} משתתפים · {new Date(go.created_at).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <p className="text-base font-black text-foreground shrink-0">₪{(go.grand_total ?? 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailOrder} onOpenChange={open => { if (!open) setDetailOrder(null); }}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto p-0" dir="rtl">

          {detailOrder && (
            <>
              {/* Modal header */}
              <div className={`px-5 pt-5 pb-4 border-b border-border/60 ${CARD_BORDER[detailOrder.status]?.replace('border-','bg-').replace('/60','').replace('/[0.015]','') ?? ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={detailOrder.status} type="order" size="md" />
                      <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                        {ORDER_TYPE_LABELS[detailOrder.order_type]}
                      </span>
                      {detailOrder.payment_status && ['paid','pending','failed'].includes(detailOrder.payment_status) && (
                        <StatusBadge status={detailOrder.payment_status} type="payment" size="md" />
                      )}
                    </div>
                    <p className="text-lg font-black text-foreground leading-tight">{detailOrder.customer_name ?? 'אורח'}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(detailOrder.created_at)}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-2xl font-black text-foreground">₪{detailOrder.total}</p>
                    {detailOrder.delivery_fee > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">כולל משלוח ₪{detailOrder.delivery_fee}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Customer info */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">פרטי לקוח</p>
                  <div className="bg-muted/30 border border-border/50 rounded-xl divide-y divide-border/40">
                    {detailOrder.customer_phone && (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground font-medium">{detailOrder.customer_phone}</span>
                      </div>
                    )}
                    {detailOrder.address && (
                      <div className="flex items-start gap-3 px-3 py-2.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{detailOrder.address}</span>
                      </div>
                    )}
                    {detailOrder.notes && (
                      <div className="flex items-start gap-3 px-3 py-2.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{detailOrder.notes}</span>
                      </div>
                    )}
                    {!detailOrder.customer_phone && !detailOrder.address && !detailOrder.notes && (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">אורח — אין פרטי קשר</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Waze navigation */}
                {detailOrder.order_type === 'delivery' && (detailOrder.address || detailOrder.latitude) && (
                  <button onClick={() => openWaze(detailOrder)}
                    className="flex items-center gap-3 w-full bg-[#05C8F7]/8 border border-[#05C8F7]/25 rounded-xl px-4 py-3 hover:bg-[#05C8F7]/14 transition-colors">
                    <WazeIcon />
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0596b8]">נווט ב-Waze</p>
                      <p className="text-[11px] text-[#0596b8]/70">{detailOrder.latitude ? 'מיקום מדויק' : 'לפי כתובת'}</p>
                    </div>
                  </button>
                )}

                {/* Items */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">פריטים</p>
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <div className="bg-muted/30 border border-border/50 rounded-xl overflow-hidden divide-y divide-border/40">
                      {detailItems.map(item => {
                        const opts = detailOptions.filter(o => o.order_item_id === item.id);
                        return (
                          <div key={item.id} className="px-3 py-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-sm font-semibold text-foreground">{item.quantity}× {item.menu_item_name}</span>
                                {opts.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {opts.map(opt => (
                                      <div key={opt.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                                        <span>{opt.option_group_name}: {opt.option_item_name}</span>
                                        {opt.option_price > 0 && <span className="text-foreground font-medium">+₪{opt.option_price}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-bold text-foreground shrink-0">₪{(item.unit_price * item.quantity).toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Totals */}
                      <div className="px-3 py-3 space-y-1.5 bg-muted/20">
                        {detailOrder.delivery_fee > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>דמי משלוח</span><span>₪{detailOrder.delivery_fee}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border/50">
                          <span>סה"כ לתשלום</span><span>₪{detailOrder.total}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment */}
                {!detailLoading && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">תשלום</p>
                    {detailPayment ? (
                      <div className="bg-muted/30 border border-border/50 rounded-xl divide-y divide-border/40">
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground capitalize">{detailPayment.provider}</span>
                          </div>
                          <StatusBadge status={detailPayment.status} type="payment" />
                        </div>
                        <div className="flex justify-between px-3 py-2.5">
                          <span className="text-xs text-muted-foreground">סכום</span>
                          <span className="text-sm font-bold text-foreground">₪{detailPayment.amount}</span>
                        </div>
                        {detailPayment.provider_payment_id && (
                          <div className="flex justify-between px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">מזהה עסקה</span>
                            <span className="text-xs font-mono text-foreground truncate max-w-[180px]">{detailPayment.provider_payment_id}</span>
                          </div>
                        )}
                        {detailPayment.paid_at && (
                          <div className="flex justify-between px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">שולם ב</span>
                            <span className="text-xs text-foreground">{fmtDate(detailPayment.paid_at)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 px-3 py-3 bg-muted/30 border border-border/50 rounded-xl">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">הזמנה ידנית — ללא תשלום אונליין</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Status change */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">עדכון סטטוס</p>
                  <div className="flex gap-2 flex-wrap">
                    {allStatuses.map(s => (
                      <button key={s} onClick={() => updateStatus(detailOrder.id, s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          detailOrder.status === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;