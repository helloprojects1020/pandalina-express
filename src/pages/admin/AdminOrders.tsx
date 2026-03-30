import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, Clock, ChefHat, CheckCircle, XCircle, Wifi, CreditCard, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DateRangePicker, DateRange } from '@/components/admin/DateRangePicker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-700 border-blue-200', preparing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  ready: 'bg-green-500/10 text-green-700 border-green-200', completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};
const statusLabels: Record<string, string> = { new: 'חדשה', preparing: 'בהכנה', ready: 'מוכנה', completed: 'הושלמה', cancelled: 'בוטלה' };
const orderTypeLabels: Record<string, string> = { pickup: 'איסוף עצמי', delivery: 'משלוח', dine_in: 'ישיבה במקום' };
const paymentStatusColors: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-700 border-green-200', pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
};
const paymentStatusLabels: Record<string, string> = { paid: 'שולם', pending: 'ממתין לתשלום', failed: 'תשלום נכשל' };
const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="w-3.5 h-3.5" />, preparing: <ChefHat className="w-3.5 h-3.5" />,
  ready: <CheckCircle className="w-3.5 h-3.5" />, completed: <CheckCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};
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

const AdminOrders = () => {
  const { restaurantId } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">הזמנות</h1>
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isLive ? 'bg-green-500/10 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            <Wifi className="w-3 h-3" />{isLive ? 'Live' : 'מתחבר...'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={r => { setDateRange(r); }} />
          <Button variant="outline" size="sm" onClick={() => setSoundEnabled(v => !v)} className={soundEnabled ? 'text-green-700 border-green-300' : 'text-muted-foreground'}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="mr-1 text-xs">{soundEnabled ? 'צליל פועל' : 'צליל כבוי'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders}>רענן</Button>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">פעילות</SelectItem>
              <SelectItem value="all">הכל</SelectItem>
              {allStatuses.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date range indicator */}
      {dateRange && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary font-medium">
          📅 מסנן לפי תאריכים: {new Date(dateRange.from).toLocaleDateString('he-IL')} — {new Date(dateRange.to).toLocaleDateString('he-IL')}
          {' '}· {orders.length} הזמנות
        </div>
      )}

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
          <p className="text-muted-foreground">{dateRange ? 'אין הזמנות בטווח התאריכים הנבחר.' : 'אין הזמנות.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id} className={`bg-card rounded-xl p-4 shadow-sm flex items-center gap-3 ${order.status === 'new' ? 'border border-blue-200' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs gap-1 ${statusColors[order.status]}`}>
                    {statusIcons[order.status]}{statusLabels[order.status]}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">{orderTypeLabels[order.order_type] ?? order.order_type}</Badge>
                  {order.payment_status && ['paid', 'pending', 'failed'].includes(order.payment_status) && (
                    <Badge variant="outline" className={`text-xs gap-1 ${paymentStatusColors[order.payment_status]}`}>
                      <CreditCard className="w-3 h-3" />{paymentStatusLabels[order.payment_status]}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground mt-1">{order.customer_name ?? 'אורח'} · {order.customer_phone ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">₪{order.total} · {fmtDate(order.created_at)}</p>
              </div>

              {order.order_type === 'delivery' && (order.address || order.latitude) && (
                <button onClick={() => openWaze(order)} title="נווט ב-Waze"
                  className="shrink-0 w-9 h-9 rounded-xl bg-[#05C8F7]/10 border border-[#05C8F7]/30 flex items-center justify-center hover:bg-[#05C8F7]/20 transition-colors">
                  <WazeIcon />
                </button>
              )}

              {order.status === 'new' && <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'preparing')}><ChefHat className="w-3.5 h-3.5 mr-1" />התחל הכנה</Button>}
              {order.status === 'preparing' && <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'ready')}><CheckCircle className="w-3.5 h-3.5 mr-1" />מוכן</Button>}
              {order.status === 'ready' && <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'completed')}>הושלם</Button>}
              <Button variant="ghost" size="icon" onClick={() => openDetail(order)}><Eye className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => { if (!open) setDetailOrder(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>פרטי הזמנה</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">לקוח</p><p className="text-foreground">{detailOrder.customer_name ?? 'אורח'}</p>
                <p className="text-muted-foreground">טלפון</p><p className="text-foreground">{detailOrder.customer_phone ?? '—'}</p>
                <p className="text-muted-foreground">סוג הזמנה</p><p className="text-foreground">{orderTypeLabels[detailOrder.order_type]}</p>
                <p className="text-muted-foreground">סטטוס</p>
                <Badge variant="outline" className={`w-fit text-xs gap-1 ${statusColors[detailOrder.status]}`}>{statusLabels[detailOrder.status]}</Badge>
                {detailOrder.address && (<><p className="text-muted-foreground">כתובת</p><p className="text-foreground">{detailOrder.address}</p></>)}
                {detailOrder.notes && (<><p className="text-muted-foreground">הערות</p><p className="text-foreground">{detailOrder.notes}</p></>)}
              </div>

              {detailOrder.order_type === 'delivery' && (detailOrder.address || detailOrder.latitude) && (
                <div className="border-t border-border pt-3">
                  <button onClick={() => openWaze(detailOrder)}
                    className="flex items-center gap-2 w-full bg-[#05C8F7]/10 border border-[#05C8F7]/30 rounded-xl px-4 py-2.5 hover:bg-[#05C8F7]/20 transition-colors">
                    <WazeIcon />
                    <span className="text-sm font-medium text-[#0596b8]">נווט ב-Waze{detailOrder.latitude ? ' · מיקום מדויק 📍' : ' · לפי כתובת'}</span>
                  </button>
                </div>
              )}

              {detailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : detailPayment ? (
                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <p className="font-semibold text-sm text-foreground">תשלום</p>
                    <Badge variant="outline" className={`text-xs ${paymentStatusColors[detailPayment.status] ?? ''}`}>{paymentStatusLabels[detailPayment.status] ?? detailPayment.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-sm">
                    <p className="text-muted-foreground">ספק</p><p className="text-foreground capitalize">{detailPayment.provider}</p>
                    <p className="text-muted-foreground">סכום</p><p className="text-foreground">₪{detailPayment.amount}</p>
                    {detailPayment.provider_payment_id && (<><p className="text-muted-foreground">מזהה עסקה</p><p className="text-foreground text-xs font-mono truncate">{detailPayment.provider_payment_id}</p></>)}
                    {detailPayment.paid_at && (<><p className="text-muted-foreground">שולם ב</p><p className="text-foreground">{fmtDate(detailPayment.paid_at)}</p></>)}
                  </div>
                </div>
              ) : (
                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" /><p className="text-sm text-muted-foreground">הזמנה דרך WhatsApp — ללא תשלום אונליין</p></div>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <p className="font-semibold text-sm text-foreground mb-2">פריטים</p>
                {detailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <div className="space-y-3">
                    {detailItems.map(item => {
                      const itemOptions = detailOptions.filter(o => o.order_item_id === item.id);
                      return (
                        <div key={item.id} className="text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium text-foreground">{item.quantity}x {item.menu_item_name}</span>
                            <span className="text-muted-foreground">₪{(item.unit_price * item.quantity).toFixed(0)}</span>
                          </div>
                          {itemOptions.length > 0 && (
                            <div className="mt-1 space-y-0.5 pr-3">
                              {itemOptions.map(opt => (
                                <div key={opt.id} className="flex justify-between text-xs text-muted-foreground">
                                  <span>{opt.option_group_name}: {opt.option_item_name}</span>
                                  {opt.option_price > 0 && <span>+₪{opt.option_price}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="border-t border-border pt-2 space-y-1 text-sm">
                      {detailOrder.delivery_fee > 0 && <div className="flex justify-between text-muted-foreground"><span>משלוח</span><span>₪{detailOrder.delivery_fee}</span></div>}
                      <div className="flex justify-between font-bold"><span>סה"כ</span><span>₪{detailOrder.total}</span></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">שנה סטטוס:</p>
                <div className="flex gap-2 flex-wrap">
                  {allStatuses.map(s => (
                    <Button key={s} size="sm" variant={detailOrder.status === s ? 'default' : 'outline'} onClick={() => updateStatus(detailOrder.id, s)} className="text-xs">{statusLabels[s]}</Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;