import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ChefHat, Clock } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type OrderRow = {
  id: string;
  customer_name: string | null;
  order_type: 'pickup' | 'delivery' | 'dine_in';
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  source: string | null;
  payment_status: string | null;
};

type OrderItemRow = {
  id: string;
  menu_item_name: string;
  quantity: number;
};

type OrderItemOptionRow = {
  id: string;
  order_item_id: string;
  option_group_name: string;
  option_item_name: string;
  option_price: number;
};

type OrderWithItems = OrderRow & {
  items: (OrderItemRow & { options: OrderItemOptionRow[] })[];
};

const orderTypeLabels: Record<string, string> = {
  pickup: 'איסוף',
  delivery: 'משלוח',
  dine_in: 'שולחן',
};

const statusLabels: Record<string, string> = {
  new: 'חדשה',
  preparing: 'בהכנה',
  ready: 'מוכנה',
};

const statusColors: Record<string, string> = {
  new: 'border-blue-400 bg-blue-50 dark:bg-blue-950',
  preparing: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950',
  ready: 'border-green-400 bg-green-50 dark:bg-green-950',
};

const statusButtonColors: Record<string, string> = {
  new: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  preparing: 'bg-green-500 hover:bg-green-600 text-white',
  ready: 'bg-muted text-muted-foreground',
};

const nextStatus: Record<string, string> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

const nextStatusLabel: Record<string, string> = {
  new: '🍳 התחל הכנה',
  preparing: '✅ מוכן',
  ready: '📦 נמסר',
};

const ACTIVE_STATUSES = ['new', 'preparing', 'ready'];

const isAllowedInKitchen = (order: OrderRow): boolean => {
  const onlineSources = ['web', 'online'];
  const isOnline = onlineSources.includes(order.source ?? '');
  if (!isOnline) return true;
  return order.payment_status === 'paid';
};

const KitchenScreen = () => {
  const { restaurantId } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!restaurantId) return;

    const { data: ordersData } = await db
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true });

    if (!ordersData) { setLoading(false); return; }

    const filteredOrders = ordersData.filter(isAllowedInKitchen);

    const ordersWithItems: OrderWithItems[] = await Promise.all(
      filteredOrders.map(async (order: OrderRow) => {
        const { data: itemsData } = await db
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        const items = itemsData ?? [];
        const itemIds = items.map((i: OrderItemRow) => i.id);

        let options: OrderItemOptionRow[] = [];
        if (itemIds.length > 0) {
          const { data: optionsData } = await db
            .from('order_item_options')
            .select('*')
            .in('order_item_id', itemIds);
          options = optionsData ?? [];
        }

        return {
          ...order,
          items: items.map((item: OrderItemRow) => ({
            ...item,
            options: options.filter((o: OrderItemOptionRow) => o.order_item_id === item.id),
          })),
        };
      })
    );

    setOrders(ordersWithItems);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`kitchen-${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => { fetchOrders(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  const updateStatus = async (orderId: string, status: string) => {
    await db.from('orders').update({ status }).eq('id', orderId);
    if (status === 'completed') {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as OrderRow['status'] } : o));
    }
  };

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  const columns = ['new', 'preparing', 'ready'] as const;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ChefHat className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">מסך מטבח</h1>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {columns.map(col => {
          const colOrders = orders.filter(o => o.status === col);
          return (
            <div key={col}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm text-foreground">{statusLabels[col]}</h2>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8 border border-dashed border-border rounded-xl">
                    אין הזמנות
                  </div>
                ) : (
                  colOrders.map(order => (
                    <div key={order.id} className={`rounded-xl border-2 p-4 space-y-3 ${statusColors[order.status]}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-foreground">
                            {order.customer_name ?? 'אורח'}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-full text-foreground">
                              {orderTypeLabels[order.order_type]}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {fmtTime(order.created_at)}
                            </span>
                            {order.payment_status === 'paid' && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                💳 שולם
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items.map(item => (
                          <div key={item.id} className="bg-white/60 dark:bg-black/20 rounded-lg p-2">
                            <p className="font-semibold text-sm text-foreground">
                              {item.quantity}x {item.menu_item_name}
                            </p>
                            {item.options.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.options.map(opt => (
                                  <p key={opt.id} className="text-xs text-muted-foreground">
                                    {opt.option_group_name}: {opt.option_item_name}
                                    {opt.option_price > 0 && ` +₪${opt.option_price}`}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <p className="text-xs text-muted-foreground bg-white/40 dark:bg-black/20 rounded-lg p-2">
                          📝 {order.notes}
                        </p>
                      )}

                      {nextStatus[order.status] && (
                        <button
                          onClick={() => updateStatus(order.id, nextStatus[order.status])}
                          className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${statusButtonColors[order.status]}`}
                        >
                          {nextStatusLabel[order.status]}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenScreen;