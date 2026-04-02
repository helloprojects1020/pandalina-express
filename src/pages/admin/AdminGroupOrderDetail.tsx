import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  PageHeader, KpiCard, SectionCard, LoadingState, EmptyState, ActionButton,
} from '@/components/admin/AdminUI';
import { Users, ShoppingBag, Banknote, CreditCard, Lock, Send, Phone, ArrowRight } from 'lucide-react';
import { lockGroupOrder, submitGroupOrder, markParticipantPaid } from '@/services/groupOrderService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemRow = {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
};

type ParticipantRow = {
  id: string;
  name: string;
  phone: string | null;
  is_host: boolean;
  status: string;
  payment_status: string;
  subtotal: number;
  items: ItemRow[];
};

type GroupOrderDetail = {
  id: string;
  title: string | null;
  host_name: string;
  host_phone: string | null;
  status: string;
  payment_mode: string;
  notes: string | null;
  expires_at: string | null;
  locked_at: string | null;
  submitted_at: string | null;
  created_at: string;
  share_token: string;
  participants: ParticipantRow[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  open: 'פתוחה', locked: 'נעולה', submitted: 'נשלחה', cancelled: 'בוטלה', expired: 'פגה תוקף',
};

const STATUS_STYLE: Record<string, string> = {
  open:      'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  locked:    'bg-amber-500/15 text-amber-700 border-amber-200',
  submitted: 'bg-blue-500/15 text-blue-700 border-blue-200',
  cancelled: 'bg-red-500/15 text-red-600 border-red-200',
  expired:   'bg-muted/40 text-muted-foreground border-border',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: 'לא שולם', paid: 'שולם', partially_paid: 'שולם חלקית', failed: 'נכשל',
};

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  unpaid:          'bg-muted/40 text-muted-foreground border-border',
  paid:            'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  partially_paid:  'bg-amber-500/15 text-amber-700 border-amber-200',
  failed:          'bg-red-500/15 text-red-600 border-red-200',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminGroupOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [groupOrder, setGroupOrder] = useState<GroupOrderDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadGroupOrder = useCallback(async () => {
    if (!id) return;

    const { data: goData, error: goError } = await db
      .from('group_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (goError || !goData) {
      setLoading(false);
      return;
    }

    const { data: participants } = await db
      .from('group_order_participants')
      .select('*')
      .eq('group_order_id', id)
      .order('created_at', { ascending: true });

    const pList = (participants ?? []) as ParticipantRow[];

    // Fetch items for all participants
    const enriched: ParticipantRow[] = await Promise.all(
      pList.map(async (p) => {
        const { data: items } = await db
          .from('group_order_items')
          .select('id, name, quantity, unit_price, line_total, notes')
          .eq('participant_id', p.id)
          .order('created_at', { ascending: true });
        return { ...p, items: (items ?? []) as ItemRow[] };
      }),
    );

    setGroupOrder({ ...goData, participants: enriched });
    setLoading(false);
  }, [id]);

  useEffect(() => { loadGroupOrder(); }, [loadGroupOrder]);

  const handleLock = async () => {
    if (!groupOrder) return;
    // Find host participant
    const host = groupOrder.participants.find(p => p.is_host);
    if (!host) { toast({ title: 'לא נמצא משתתף מארח', variant: 'destructive' }); return; }

    setActionLoading(true);
    try {
      await lockGroupOrder(groupOrder.id, host.id);
      await loadGroupOrder();
      toast({ title: 'ההזמנה ננעלה' });
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : 'שגיאה', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!groupOrder) return;
    setActionLoading(true);
    try {
      await submitGroupOrder(groupOrder.id);
      await loadGroupOrder();
      toast({ title: 'ההזמנה נשלחה' });
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : 'שגיאה', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (participantId: string) => {
    setActionLoading(true);
    try {
      await markParticipantPaid(participantId);
      await loadGroupOrder();
      toast({ title: 'סטטוס תשלום עודכן' });
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : 'שגיאה', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  if (!groupOrder) {
    return (
      <div dir="rtl">
        <EmptyState icon={Users} title="הזמנה לא נמצאה" description="ייתכן שההזמנה הוסרה" />
      </div>
    );
  }

  const grandTotal    = groupOrder.participants.reduce((s, p) => s + Number(p.subtotal), 0);
  const totalItems    = groupOrder.participants.reduce((s, p) => s + p.items.length, 0);
  const paidCount     = groupOrder.participants.filter(p => p.payment_status === 'paid').length;
  const isOpen        = groupOrder.status === 'open';
  const isLocked      = groupOrder.status === 'locked';
  const canSubmit     = isOpen || isLocked;

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-5" dir="rtl">
      {/* Page Header */}
      <PageHeader
        title={groupOrder.title ?? 'הזמנה קבוצתית'}
        description={`מארח: ${groupOrder.host_name} · נוצר ${fmtDate(groupOrder.created_at)}`}
        actions={
          <>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_STYLE[groupOrder.status] ?? ''}`}>
              {STATUS_LABEL[groupOrder.status] ?? groupOrder.status}
            </span>
            <ActionButton label="חזור" icon={ArrowRight} onClick={() => navigate('/admin/orders')} />
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="משתתפים"
          value={groupOrder.participants.length}
          icon={Users}
          accent="#6366f1"
        />
        <KpiCard
          label={'סה"כ פריטים'}
          value={totalItems}
          icon={ShoppingBag}
          accent="#f59e0b"
        />
        <KpiCard
          label={'סה"כ פריטים'}
          value={`₪${grandTotal.toFixed(2)}`}
          icon={Banknote}
          accent="#10b981"
        />
        <KpiCard
          label="שילמו"
          value={`${paidCount}/${groupOrder.participants.length}`}
          icon={CreditCard}
          accent="#3b82f6"
        />
      </div>

      {/* Meta info */}
      <SectionCard title="פרטי הזמנה" icon={ShoppingBag}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">אופן תשלום</p>
            <p className="text-foreground font-semibold mt-0.5">
              {groupOrder.payment_mode === 'split' ? 'כל אחד משלם לחוד' : 'המארח משלם הכל'}
            </p>
          </div>
          {groupOrder.host_phone && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">טלפון מארח</p>
              <p className="text-foreground font-semibold mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-muted-foreground" />
                {groupOrder.host_phone}
              </p>
            </div>
          )}
          {groupOrder.expires_at && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">תפוגה</p>
              <p className="text-foreground font-semibold mt-0.5">{fmtDate(groupOrder.expires_at)}</p>
            </div>
          )}
          {groupOrder.submitted_at && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">נשלח ב</p>
              <p className="text-foreground font-semibold mt-0.5">{fmtDate(groupOrder.submitted_at)}</p>
            </div>
          )}
          {groupOrder.notes && (
            <div className="col-span-2">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">הערות</p>
              <p className="text-foreground mt-0.5">{groupOrder.notes}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Per-participant cards */}
      {groupOrder.participants.length === 0 ? (
        <EmptyState icon={Users} title="אין משתתפים" />
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">משתתפים</p>
          {groupOrder.participants.map(p => (
            <SectionCard
              key={p.id}
              title={p.name}
              description={p.phone ?? undefined}
              icon={Users}
              action={
                <div className="flex items-center gap-2">
                  {p.is_host && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">מארח</span>
                  )}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${PAYMENT_STATUS_STYLE[p.payment_status] ?? ''}`}>
                    {PAYMENT_STATUS_LABEL[p.payment_status] ?? p.payment_status}
                  </span>
                  {p.payment_status !== 'paid' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 rounded-lg"
                      onClick={() => handleMarkPaid(p.id)}
                      disabled={actionLoading}
                    >
                      סמן כשולם
                    </Button>
                  )}
                </div>
              }
            >
              <div className="space-y-2">
                {p.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">אין פריטים</p>
                ) : (
                  <div className="space-y-1.5">
                    {p.items.map(item => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <span className="text-foreground">
                          <span className="text-muted-foreground text-xs">{item.quantity}x </span>
                          {item.name}
                          {item.notes && <span className="text-xs text-muted-foreground mr-2">({item.notes})</span>}
                        </span>
                        <span className="font-bold text-foreground shrink-0 mr-3">₪{Number(item.line_total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-border/40 pt-2 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">סה"כ משתתף</span>
                  <span className="text-sm font-black text-foreground">₪{Number(p.subtotal).toFixed(2)}</span>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {canSubmit && (
        <div className="flex gap-3 pt-2">
          {isOpen && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={handleLock}
              disabled={actionLoading}
            >
              <Lock className="w-4 h-4" />
              נעל הזמנה
            </Button>
          )}
          <Button
            className="gap-1.5"
            onClick={handleSubmit}
            disabled={actionLoading || totalItems === 0}
          >
            <Send className="w-4 h-4" />
            שלח הזמנה
          </Button>
        </div>
      )}
    </div>
  );
}
