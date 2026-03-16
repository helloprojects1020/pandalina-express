import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Eye, Clock, ChefHat, CheckCircle, XCircle } from 'lucide-react';

type OrderRow = {
  id: string;
  order_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  order_type: 'pickup' | 'delivery' | 'dine_in';
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  name_he: string;
  quantity: number;
  unit_price: number;
  options_json: unknown;
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-700 border-blue-200',
  preparing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  ready: 'bg-green-500/10 text-green-700 border-green-200',
  completed: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusIcons: Record<string, React.ReactNode> = {
  new: <Clock className="w-3.5 h-3.5" />,
  preparing: <ChefHat className="w-3.5 h-3.5" />,
  ready: <CheckCircle className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';
const allStatuses: OrderStatus[] = ['new', 'preparing', 'ready', 'completed', 'cancelled'];

const AdminOrders = () => {
  const { restaurantId, loading: ridLoading } = useRestaurantId();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItemRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    let q = supabase.from('orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
    if (filterStatus === 'active') {
      q = q.in('status', ['new', 'preparing', 'ready']);
    } else if (filterStatus !== 'all') {
      q = q.eq('status', filterStatus);
    }
    const { data } = await q;
    setOrders((data as OrderRow[]) ?? []);
    setLoading(false);
  }, [restaurantId, filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-refresh every 30s for active orders
  useEffect(() => {
    if (filterStatus === 'active' || filterStatus === 'new') {
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [filterStatus, fetchOrders]);

  const openDetail = async (order: OrderRow) => {
    setDetailOrder(order);
    setDetailLoading(true);
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
    setDetailItems((data as OrderItemRow[]) ?? []);
    setDetailLoading(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    toast({ title: `Order marked as ${status}` });
    fetchOrders();
    if (detailOrder?.id === orderId) setDetailOrder(prev => prev ? { ...prev, status: status as OrderRow['status'] } : null);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  if (ridLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {allStatuses.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {orders.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 shadow-card text-center">
          <p className="text-muted-foreground">No orders found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id} className="bg-card rounded-xl p-4 shadow-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-foreground text-sm">#{order.order_number}</p>
                  <Badge variant="outline" className={`text-xs gap-1 ${statusColors[order.status]}`}>
                    {statusIcons[order.status]}
                    {order.status}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">{order.order_type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {order.customer_name ?? 'Guest'} · ₪{order.total} · {fmtDate(order.created_at)}
                </p>
              </div>

              {/* Quick status buttons */}
              {order.status === 'new' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'preparing')}>
                  <ChefHat className="w-3.5 h-3.5 mr-1" /> Start
                </Button>
              )}
              {order.status === 'preparing' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'ready')}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Ready
                </Button>
              )}
              {order.status === 'ready' && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'completed')}>
                  Complete
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={() => openDetail(order)}>
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => { if (!open) setDetailOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order #{detailOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">Customer</p>
                <p className="text-foreground">{detailOrder.customer_name ?? 'Guest'}</p>
                <p className="text-muted-foreground">Phone</p>
                <p className="text-foreground">{detailOrder.customer_phone ?? '—'}</p>
                <p className="text-muted-foreground">Type</p>
                <p className="text-foreground">{detailOrder.order_type}</p>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="outline" className={`w-fit text-xs gap-1 ${statusColors[detailOrder.status]}`}>{detailOrder.status}</Badge>
                {detailOrder.customer_address && <>
                  <p className="text-muted-foreground">Address</p>
                  <p className="text-foreground">{detailOrder.customer_address}</p>
                </>}
                {detailOrder.notes && <>
                  <p className="text-muted-foreground">Notes</p>
                  <p className="text-foreground">{detailOrder.notes}</p>
                </>}
              </div>

              <div className="border-t border-border pt-3">
                <p className="font-semibold text-sm text-foreground mb-2">Items</p>
                {detailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <div className="space-y-1">
                    {detailItems.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{item.quantity}x {item.name_he}</span>
                        <span className="text-muted-foreground">₪{(item.unit_price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-sm">
                      <span>Total</span>
                      <span>₪{detailOrder.total}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status change */}
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2">Change status:</p>
                <div className="flex gap-2 flex-wrap">
                  {allStatuses.map(s => (
                    <Button
                      key={s}
                      size="sm"
                      variant={detailOrder.status === s ? 'default' : 'outline'}
                      onClick={() => updateStatus(detailOrder.id, s)}
                      className="text-xs"
                    >
                      {s}
                    </Button>
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
