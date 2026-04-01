import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Search, Phone, ShoppingBag, TrendingUp, Clock, Repeat, Users, Star } from 'lucide-react';
import { FeatureGate } from '@/components/admin/FeatureGate';
import { PageHeader, KpiCard, LoadingState, EmptyState } from '@/components/admin/AdminUI';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Customer = {
  customer_name: string;
  customer_phone: string;
  order_count: number;
  total_spent: number;
  last_order: string;
  first_order: string;
  order_types: string[];
  cancelled_count: number;
};

type OrderHistory = {
  id: string;
  total: number;
  status: string;
  order_type: string;
  created_at: string;
  notes: string | null;
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-700',
  preparing: 'bg-yellow-500/10 text-yellow-700',
  ready: 'bg-green-500/10 text-green-700',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};
const statusLabels: Record<string, string> = { new: 'חדשה', preparing: 'בהכנה', ready: 'מוכנה', completed: 'הושלמה', cancelled: 'בוטלה' };
const orderTypeLabels: Record<string, string> = { pickup: 'איסוף', delivery: 'משלוח', dine_in: 'שולחן' };

type FilterType = 'all' | 'returning' | 'new' | 'vip';

const AdminCustomers = () => {
  const { restaurantId } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [history, setHistory] = useState<OrderHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    db.from('orders')
      .select('customer_name, customer_phone, total, status, order_type, created_at')
      .eq('restaurant_id', restaurantId)
      .not('customer_phone', 'is', null)
      .order('created_at', { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] }) => {
        const map = new Map<string, Customer>();
        (data ?? []).forEach(o => {
          const phone = o.customer_phone ?? '';
          if (!phone) return;
          const existing = map.get(phone);
          if (existing) {
            existing.order_count++;
            existing.total_spent += Number(o.total ?? 0);
            if (!existing.order_types.includes(o.order_type)) existing.order_types.push(o.order_type);
            if (o.status === 'cancelled') existing.cancelled_count++;
            // first_order = earliest date
            if (o.created_at < existing.first_order) existing.first_order = o.created_at;
          } else {
            map.set(phone, {
              customer_name: o.customer_name ?? 'אורח',
              customer_phone: phone,
              order_count: 1,
              total_spent: Number(o.total ?? 0),
              last_order: o.created_at,
              first_order: o.created_at,
              order_types: [o.order_type],
              cancelled_count: o.status === 'cancelled' ? 1 : 0,
            });
          }
        });
        const list = Array.from(map.values()).sort((a, b) => b.order_count - a.order_count);
        setCustomers(list);
        setLoading(false);
      });
  }, [restaurantId]);

  // VIP = top 20% by spend
  const vipThreshold = useMemo(() => {
    if (!customers.length) return 0;
    const sorted = [...customers].sort((a, b) => b.total_spent - a.total_spent);
    return sorted[Math.floor(sorted.length * 0.2)]?.total_spent ?? 0;
  }, [customers]);

  const getCustomerTier = (c: Customer) => {
    if (c.total_spent >= vipThreshold && vipThreshold > 0) return 'vip';
    if (c.order_count > 1) return 'returning';
    return 'new';
  };

  const filtered = useMemo(() => {
    let result = customers;
    if (filter === 'returning') result = result.filter(c => c.order_count > 1);
    else if (filter === 'new') result = result.filter(c => c.order_count === 1);
    else if (filter === 'vip') result = result.filter(c => c.total_spent >= vipThreshold && vipThreshold > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(c => c.customer_name.toLowerCase().includes(q) || c.customer_phone.includes(q));
    }
    return result;
  }, [customers, filter, search, vipThreshold]);

  const openCustomer = async (customer: Customer) => {
    setSelected(customer);
    setHistoryLoading(true);
    const { data } = await db.from('orders')
      .select('id, total, status, order_type, created_at, notes')
      .eq('restaurant_id', restaurantId)
      .eq('customer_phone', customer.customer_phone)
      .order('created_at', { ascending: false });
    setHistory((data as OrderHistory[]) ?? []);
    setHistoryLoading(false);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const fmtDateTime = (d: string) => new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  // daysSince
  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  if (loading) return <LoadingState />;

  const returningCount = customers.filter(c => c.order_count > 1).length;
  const vipCount = customers.filter(c => c.total_spent >= vipThreshold && vipThreshold > 0).length;
  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0);

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <PageHeader title="לקוחות" description={`${customers.length} לקוחות ייחודיים`} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label='סה"כ לקוחות' value={customers.length} icon={Users} accent="#3b82f6" />
        <KpiCard label="לקוחות חוזרים" value={returningCount} icon={Repeat} accent="#10b981" />
        <KpiCard label="לקוחות VIP" value={vipCount} icon={Star} accent="#f59e0b" />
        <KpiCard label="ממוצע ללקוח" value={`₪${Math.round(totalRevenue / (customers.length || 1))}`} icon={TrendingUp} accent="#8b5cf6" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { key: 'all', label: `הכל (${customers.length})`, icon: Users },
          { key: 'returning', label: `חוזרים (${returningCount})`, icon: Repeat },
          { key: 'vip', label: `VIP (${vipCount})`, icon: Star },
          { key: 'new', label: `חדשים (${customers.length - returningCount})`, icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setFilter(key as FilterType)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0 ${filter === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם או טלפון..." className="pr-9" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="לא נמצאו לקוחות" description="נסה לשנות את הסינון או החיפוש" />
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => {
            const tier = getCustomerTier(customer);
            const days = daysSince(customer.last_order);
            return (
              <button key={customer.customer_phone} onClick={() => openCustomer(customer)}
                className="w-full bg-card rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow text-start">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tier === 'vip' ? 'bg-yellow-500/20' : tier === 'returning' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                  <span className={`text-sm font-bold ${tier === 'vip' ? 'text-yellow-600' : tier === 'returning' ? 'text-green-600' : 'text-primary'}`}>
                    {customer.customer_name.charAt(0)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground text-sm">{customer.customer_name}</p>
                    {tier === 'vip' && <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-200">VIP</Badge>}
                    {(tier as string) === 'returning' && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-200">חוזר</Badge>}
                    {days > 30 && <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-700 border-orange-200">לא פעיל</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{customer.customer_phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs">
                      <ShoppingBag className="w-3 h-3 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{customer.order_count}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">הזמנות</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3 text-muted-foreground" />
                      <span className="font-semibold text-foreground">₪{Math.round(customer.total_spent)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">סה"כ</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{fmtDate(customer.last_order)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">הזמנה אחרונה</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Customer Sheet */}
      <Sheet open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          {selected && (
            <>
              <SheetHeader><SheetTitle>פרופיל לקוח</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-5">

                {/* Info */}
                <div className="bg-muted/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getCustomerTier(selected) === 'vip' ? 'bg-yellow-500/20' : 'bg-primary/10'}`}>
                      <span className={`text-lg font-bold ${getCustomerTier(selected) === 'vip' ? 'text-yellow-600' : 'text-primary'}`}>{selected.customer_name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{selected.customer_name}</p>
                        {getCustomerTier(selected) === 'vip' && <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-700 border-yellow-200">VIP</Badge>}
                        {selected.order_count > 1 && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-200">לקוח חוזר</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <a href={`tel:${selected.customer_phone}`} className="text-sm text-primary">{selected.customer_phone}</a>
                      </div>
                    </div>
                  </div>

                  {/* נתוני לקוח */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-card rounded-lg p-2">
                      <p className="text-muted-foreground">לקוח מאז</p>
                      <p className="font-semibold text-foreground mt-0.5">{fmtDate(selected.first_order)}</p>
                    </div>
                    <div className="bg-card rounded-lg p-2">
                      <p className="text-muted-foreground">הזמנה אחרונה</p>
                      <p className="font-semibold text-foreground mt-0.5">{fmtDate(selected.last_order)}</p>
                    </div>
                    <div className="bg-card rounded-lg p-2">
                      <p className="text-muted-foreground">ימים מאז הזמנה</p>
                      <p className={`font-semibold mt-0.5 ${daysSince(selected.last_order) > 30 ? 'text-orange-600' : 'text-foreground'}`}>{daysSince(selected.last_order)} ימים</p>
                    </div>
                    <div className="bg-card rounded-lg p-2">
                      <p className="text-muted-foreground">הזמנות שבוטלו</p>
                      <p className={`font-semibold mt-0.5 ${selected.cancelled_count > 0 ? 'text-red-600' : 'text-foreground'}`}>{selected.cancelled_count}</p>
                    </div>
                  </div>

                  {/* סוגי הזמנות */}
                  {selected.order_types.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {selected.order_types.map(t => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{orderTypeLabels[t] ?? t}</span>)}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-card rounded-xl p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-foreground">{selected.order_count}</p>
                    <p className="text-xs text-muted-foreground">הזמנות</p>
                  </div>
                  <div className="bg-card rounded-xl p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-foreground">₪{Math.round(selected.total_spent)}</p>
                    <p className="text-xs text-muted-foreground">סה"כ</p>
                  </div>
                  <div className="bg-card rounded-xl p-3 text-center shadow-sm">
                    <p className="text-xl font-bold text-foreground">₪{Math.round(selected.total_spent / selected.order_count)}</p>
                    <p className="text-xs text-muted-foreground">ממוצע</p>
                  </div>
                </div>

                {/* Loyalty bar */}
                <div className="bg-muted/30 rounded-xl p-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">נאמנות לקוח</span>
                    <span className="font-medium text-foreground">{selected.order_count} הזמנות</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${getCustomerTier(selected) === 'vip' ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((selected.order_count / 10) * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selected.order_count >= 10 ? 'לקוח נאמן מאוד' : selected.order_count >= 5 ? 'לקוח נאמן' : selected.order_count > 1 ? 'לקוח חוזר' : 'לקוח חדש'}
                  </p>
                </div>

                {/* WhatsApp */}
                <Button className="w-full bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => window.open(`https://wa.me/${selected.customer_phone.replace(/\D/g, '')}`, '_blank')}>
                  📲 שלח WhatsApp
                </Button>

                {/* History */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">היסטוריית הזמנות</h3>
                  {historyLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">אין הזמנות</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map(order => (
                        <div key={order.id} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>
                              <span className="text-xs text-muted-foreground">{orderTypeLabels[order.order_type]}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(order.created_at)}</p>
                            {order.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">"{order.notes}"</p>}
                          </div>
                          <p className="font-bold text-foreground text-sm">₪{order.total}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

function GatedAdminCustomers() {
  return <FeatureGate feature="customers"><AdminCustomers /></FeatureGate>;
}
export default GatedAdminCustomers;