/**
 * GroupOrderRoom — World-class group ordering experience
 *
 * Features:
 * - Optimistic updates (instant feedback, rollback on error)
 * - Realtime via Supabase postgres_changes + presence broadcast
 * - Payment tracking per participant (split mode)
 * - Full orders integration on submit
 * - Activity indicators (who's active / recently added)
 * - Skeleton loading states
 * - "Someone is adding…" live presence
 * - Cart counter + "Add more / Done" multi-add flow
 * - Gamification badges (first to order, top spender)
 * - Safe-area padding, mobile-first
 */

import {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchGroupOrderFull,
  joinGroupOrder,
  addItem,
  removeItem,
  lockGroupOrder,
  submitGroupOrder,
  markParticipantPaid,
  markParticipantUnpaid,
  setParticipantPaymentMethod,
} from '@/services/groupOrderService';
import { useGroupOrderMenu } from '@/hooks/useGroupOrderMenu';
import type { GroupMenuItem } from '@/hooks/useGroupOrderMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { handleImageError } from '@/lib/imageFallback';
import {
  Users, Link2, MessageCircle, Plus, Trash2, Lock, Send,
  Clock, ChevronDown, CheckCircle2, X, ArrowRight,
  Minus, UserRound, Sparkles, Trophy, Star, CreditCard, Banknote,
  AlertCircle, RotateCcw, Receipt, Wallet,
} from 'lucide-react';
import type {
  GroupOrderFull,
  GroupOrderParticipantFull,
  GroupOrderItemFull,
  AddItemInput,
  ParticipantPaymentMethod,
} from '@/types/groupOrder';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  open:      { label: 'פתוחה',    dot: 'bg-emerald-500 animate-pulse' },
  locked:    { label: 'נעולה',    dot: 'bg-amber-500' },
  submitted: { label: 'נשלחה',    dot: 'bg-blue-500' },
  cancelled: { label: 'בוטלה',    dot: 'bg-red-500' },
  expired:   { label: 'פגה תוקף', dot: 'bg-muted-foreground/40' },
} as const;

const PAYMENT_CFG = {
  unpaid:         { label: 'טרם שולם',    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  paid:           { label: 'שולם ✓',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  partially_paid: { label: 'שולם חלקית', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  failed:         { label: 'נכשל',        cls: 'bg-red-100 text-red-700 border-red-200' },
} as const;

const PAYMENT_METHOD_CFG = {
  none:   { label: null,       icon: null,    cls: '' },
  cash:   { label: 'מזומן',    icon: 'cash',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  online: { label: 'אונליין',  icon: 'card',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
} as const;

const AVATAR_PALETTE = [
  'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500',
  'bg-blue-500',   'bg-pink-500', 'bg-indigo-500','bg-cyan-500',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function fmt(n: number | string) {
  return `₪${Number(n).toFixed(2)}`;
}
function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'פג תוקף';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}ש׳ ${m}ד׳` : `${m} דקות`;
}
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1) return 'עכשיו';
  if (diff < 60) return `לפני ${diff} דק'`;
  return `לפני ${Math.floor(diff / 60)} ש'`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md', isMe }: { name: string; size?: 'sm' | 'md' | 'lg'; isMe?: boolean }) {
  const sz = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-base' }[size];
  return (
    <div className={`${sz} ${isMe ? 'bg-primary' : avatarColor(name)} rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-sm`}>
      {initials(name)}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded-lg w-28" />
          <div className="h-2.5 bg-muted rounded-lg w-16" />
        </div>
        <div className="h-3 bg-muted rounded-lg w-12" />
      </div>
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-2xl border border-border/40 animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-muted rounded-lg w-3/4" />
        <div className="h-2.5 bg-muted rounded-lg w-1/2" />
        <div className="h-3 bg-muted rounded-lg w-14" />
      </div>
    </div>
  );
}

// ─── Join Modal ───────────────────────────────────────────────────────────────

function JoinModal({ token, orderTitle, hostName, participantCount, onJoined }: {
  token: string; orderTitle: string | null; hostName: string;
  participantCount: number; onJoined: (pid: string) => void;
}) {
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { participant } = await joinGroupOrder(token, name.trim());
      sessionStorage.setItem(`go_pid_${token}`, participant.id);
      onJoined(participant.id);
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : 'שגיאה', variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/8 to-transparent pt-14 pb-8 px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/12 border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Users className="w-9 h-9 text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-1 leading-tight">
          {orderTitle ?? 'הזמנה קבוצתית'}
        </h1>
        <p className="text-sm text-muted-foreground">{hostName} מזמין אותך</p>
        {participantCount > 0 && (
          <div className="inline-flex items-center gap-1.5 mt-3 bg-card border border-border/50 rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <Users className="w-3 h-3" />
            {participantCount} {participantCount === 1 ? 'משתתף כבר הצטרף' : 'משתתפים כבר הצטרפו'}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-end px-5 pb-10 sm:justify-center sm:max-w-sm sm:mx-auto sm:w-full">
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-sm font-semibold text-foreground mb-3">איך קוראים לך?</p>
          <form onSubmit={handleJoin} className="space-y-3">
            <div className="relative">
              <UserRound className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input value={name} onChange={e => setName(e.target.value)}
                placeholder="השם שלך" className="h-12 pr-10 text-base rounded-xl"
                required autoFocus />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl gap-2"
              disabled={loading || !name.trim()}>
              {loading
                ? <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    מצטרף...
                  </span>
                : <span className="flex items-center gap-2">הצטרף להזמנה <ArrowRight className="w-4 h-4" /></span>
              }
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground/50">
          תוכל לבחור מהתפריט מיד לאחר ההצטרפות
        </p>
      </div>
    </div>
  );
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────

function AddItemModal({
  restaurantId, sessionCount,
  onAdd, onBroadcastAdding, onClose,
}: {
  restaurantId: string;
  sessionCount: number;
  onAdd: (item: AddItemInput) => Promise<void>;
  onBroadcastAdding: (active: boolean) => void;
  onClose: () => void;
}) {
  // ── Real menu data — same image resolution as the main site ──────────────
  const { categories, items: allItems, loading: menuLoading } = useGroupOrderMenu(restaurantId);

  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [selected,  setSelected]  = useState<GroupMenuItem | null>(null);
  const [quantity,  setQuantity]  = useState(1);
  const [notes,     setNotes]     = useState('');
  const [adding,    setAdding]    = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const catBarRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout>>();

  // Broadcast "I'm adding" presence
  useEffect(() => {
    onBroadcastAdding(true);
    return () => { onBroadcastAdding(false); };
  }, [onBroadcastAdding]);

  // Set first category once menu loads
  useEffect(() => {
    if (!menuLoading && categories.length > 0 && !activeCat) {
      setActiveCat(categories[0].slug);
    }
  }, [menuLoading, categories, activeCat]);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeCat || !catBarRef.current) return;
    (catBarRef.current.querySelector(`[data-cat="${activeCat}"]`) as HTMLElement)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCat]);

  // Auto-clear "just added" bar after 3s
  useEffect(() => {
    if (!justAdded) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(null), 3000);
    return () => clearTimeout(timerRef.current);
  }, [justAdded]);

  // Filter items by active category slug (MenuItem.categoryId = slug)
  const visibleItems = activeCat
    ? allItems.filter(i => i.categoryId === activeCat)
    : allItems;

  const lineTotal = selected ? selected.price * quantity : 0;

  const selectItem = (item: GroupMenuItem) => {
    setSelected(p => p?.id === item.id ? null : item);
    setQuantity(1); setNotes(''); setJustAdded(null);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      await onAdd({
        menuItemId: selected.id,
        name:       selected.name,
        quantity,
        unitPrice:  selected.price,
        notes:      notes || undefined,
      });
      setJustAdded(selected.name);
      // Don't auto-close — let user keep adding
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : 'שגיאה', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" dir="rtl">

      {/* ── Modal header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0 bg-card gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors active:scale-90 shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <h2 className="text-base font-bold truncate">בחר מהתפריט</h2>
          {sessionCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shrink-0">
              {sessionCount}
            </span>
          )}
        </div>
        {sessionCount > 0 && (
          <button
            onClick={onClose}
            className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
            סיימתי
          </button>
        )}
      </div>

      {/* ── Category tabs ─────────────────────────────────────────────────── */}
      <div ref={catBarRef}
        className="flex gap-2 px-4 py-2.5 overflow-x-auto shrink-0 border-b border-border/40 scrollbar-hide bg-card">
        {menuLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-muted animate-pulse shrink-0" />
            ))
          : categories.map(cat => (
              <button key={cat.slug} data-cat={cat.slug}
                onClick={() => setActiveCat(cat.slug)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                  activeCat === cat.slug
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}>
                {cat.name_he ?? cat.name}
              </button>
            ))
        }
      </div>

      {/* ── Product grid ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {menuLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-card border border-border/40 p-3 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-muted rounded-lg w-3/4" />
                  <div className="h-2.5 bg-muted rounded-lg w-1/2" />
                  <div className="h-3 bg-muted rounded-lg w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <span className="text-2xl">🍽️</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">אין פריטים בקטגוריה זו</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-4 pb-2">
            {visibleItems.map(item => {
              const isSel = selected?.id === item.id;
              return (
                <button key={item.id} onClick={() => selectItem(item)}
                  className={`group relative flex items-center gap-3 bg-card rounded-2xl border overflow-hidden text-right transition-all duration-150 active:scale-[0.98] p-3 ${
                    isSel
                      ? 'border-primary shadow-md ring-2 ring-primary/20 bg-primary/[0.03]'
                      : 'border-border/50 hover:border-primary/30 hover:shadow-sm'
                  }`}>

                  {/* Image — compact square on the end (left in RTL) */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-secondary shrink-0 order-last">
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-500 ${isSel ? 'scale-105' : 'group-hover:scale-105'}`}
                      loading="lazy"
                      onError={handleImageError}
                    />
                    {isSel && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info — text on start (right in RTL) */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    {item.isFeatured && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5 mb-0.5">
                        ⭐ הכי פופולרי
                      </span>
                    )}
                    <p className={`text-sm font-bold leading-snug line-clamp-2 ${isSel ? 'text-primary' : 'text-foreground'}`}>
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm font-black text-primary mt-1">
                      ₪{item.price}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {/* Spacer so bottom panel doesn't cover last row */}
        <div className="h-4" />
      </div>

      {/* ── Bottom action panel ───────────────────────────────────────────── */}
      <div className="border-t border-border/60 bg-card shrink-0"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>

        {/* Post-add confirmation */}
        {justAdded && (
          <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold text-emerald-800 truncate">{justAdded} נוסף! 🛒</span>
            </div>
            <div className="flex gap-2 shrink-0 mr-2">
              <button
                onClick={() => { setSelected(null); setQuantity(1); setNotes(''); setJustAdded(null); }}
                className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors">
                הוסף עוד
              </button>
              <button onClick={onClose}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition-colors">
                סיים
              </button>
            </div>
          </div>
        )}

        {selected && !justAdded && (
          <div className="px-4 pt-3 pb-1">
            {/* Selected item preview strip */}
            <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-2.5 mb-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                <img src={selected.image} alt={selected.name}
                  className="w-full h-full object-cover" onError={handleImageError} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{selected.name}</p>
                <p className="text-xs text-primary font-bold">₪{selected.price}</p>
              </div>
            </div>

            <Input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="הערות לפריט (ללא בצל, חריף...)"
              className="h-10 text-sm rounded-xl mb-2.5" />

            <div className="flex items-center gap-3">
              {/* Qty stepper */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 shrink-0">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg bg-card border border-border/50 flex items-center justify-center hover:bg-muted active:scale-90 transition-all">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-black">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}
                  className="w-9 h-9 rounded-lg bg-card border border-border/50 flex items-center justify-center hover:bg-muted active:scale-90 transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <Button className="flex-1 h-11 font-bold rounded-xl text-sm gap-2" onClick={handleAdd} disabled={adding}>
                {adding
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span>הוסף לסל</span><span className="text-white/70 text-xs font-normal">₪{lineTotal.toFixed(2)}</span></>
                }
              </Button>
            </div>
          </div>
        )}

        {!selected && !justAdded && (
          <p className="text-xs text-center text-muted-foreground/50 py-3">
            בחר פריט מהתפריט כדי להוסיף לסל שלך
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ participant, isMe, paymentMode, onToggle }: {
  participant: GroupOrderParticipantFull;
  isMe: boolean;
  paymentMode: string;
  onToggle?: () => void;
}) {
  if (paymentMode !== 'split') return null;
  if (Number(participant.subtotal) === 0) return null;

  const { label, cls } = PAYMENT_CFG[participant.payment_status] ?? PAYMENT_CFG.unpaid;
  const canToggle = isMe && (participant.payment_status === 'unpaid' || participant.payment_status === 'paid');

  return (
    <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30">
      <span className="text-xs text-muted-foreground">
        {isMe ? 'סטטוס תשלום שלי' : 'תשלום'}
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-px rounded-full border ${cls}`}>{label}</span>
        {canToggle && (
          <button
            onClick={onToggle}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
              participant.payment_status === 'unpaid'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {participant.payment_status === 'unpaid' ? 'סמן כשולם' : 'בטל תשלום'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Pay Now Modal ────────────────────────────────────────────────────────────

function PayNowModal({ participant, onClose, onToggle, onSetMethod }: {
  participant: GroupOrderParticipantFull;
  onClose: () => void;
  onToggle: () => void;
  onSetMethod: (method: ParticipantPaymentMethod) => void;
}) {
  const isPaid   = participant.payment_status === 'paid';
  const method   = participant.payment_method ?? 'none';
  const { label: statusLabel, cls: statusCls } = PAYMENT_CFG[participant.payment_status] ?? PAYMENT_CFG.unpaid;

  return (
    <AnimatePresence>
      <motion.div
        key="pay-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        key="pay-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 inset-x-0 z-50 bg-background rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
        dir="rtl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div>
            <h2 className="text-base font-black">תשלום</h2>
            <p className="text-xs text-muted-foreground mt-0.5">בחר אופן תשלום לאישור הזמנתך</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Amount strip */}
          <div className="bg-primary/[0.06] border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={participant.name} isMe size="lg" />
              <div>
                <p className="text-sm font-bold">{participant.name}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-px rounded-full border mt-0.5 ${statusCls}`}>{statusLabel}</span>
              </div>
            </div>
            <span className="text-2xl font-black text-primary">{fmt(participant.subtotal)}</span>
          </div>

          {/* Items list */}
          {participant.items.length > 0 && (
            <div className="bg-card border border-border/40 rounded-xl divide-y divide-border/30">
              {participant.items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm px-4 py-2.5">
                  <span className="text-muted-foreground">{item.quantity}× {item.name}</span>
                  <span className="font-semibold">{fmt(item.line_total)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Payment method choice ── */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-0.5">אופן תשלום</p>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Online */}
              <button
                onClick={() => onSetMethod('online')}
                className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
                  method === 'online'
                    ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                    : 'border-border/50 bg-card hover:border-blue-300'
                }`}
              >
                {method === 'online' && (
                  <CheckCircle2 className="absolute top-2 left-2 w-4 h-4 text-blue-500" />
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${method === 'online' ? 'bg-blue-500' : 'bg-muted'}`}>
                  <CreditCard className={`w-5 h-5 ${method === 'online' ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${method === 'online' ? 'text-blue-700' : 'text-foreground'}`}>תשלום אונליין</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">כרטיס / Bit / Apple Pay</p>
                </div>
              </button>

              {/* Cash */}
              <button
                onClick={() => onSetMethod('cash')}
                className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all ${
                  method === 'cash'
                    ? 'border-amber-500 bg-amber-50 shadow-sm shadow-amber-100'
                    : 'border-border/50 bg-card hover:border-amber-300'
                }`}
              >
                {method === 'cash' && (
                  <CheckCircle2 className="absolute top-2 left-2 w-4 h-4 text-amber-500" />
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${method === 'cash' ? 'bg-amber-500' : 'bg-muted'}`}>
                  <Banknote className={`w-5 h-5 ${method === 'cash' ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${method === 'cash' ? 'text-amber-700' : 'text-foreground'}`}>תשלום מזומן</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">תשלם ישירות למסעדה</p>
                </div>
              </button>
            </div>

            {/* Contextual note */}
            {method === 'cash' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2"
              >
                <Banknote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>תשלום מזומן: </strong>
                  {fmt(participant.subtotal)} ישולם ישירות במסעדה. המארח ידע שאתה משלם מזומן.
                </p>
              </motion.div>
            )}
            {method === 'online' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-center space-y-1"
              >
                <p className="text-xs font-semibold text-blue-700">תשלום דיגיטלי</p>
                <p className="text-[11px] text-blue-600/70">PayPlus / Bit / Apple Pay — בקרוב</p>
              </motion.div>
            )}
          </div>

          {/* Manual paid toggle */}
          <div className="border-t border-border/40 pt-3">
            <button
              onClick={() => { onToggle(); onClose(); }}
              className={`w-full h-11 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                isPaid
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isPaid ? 'בטל סימון תשלום' : 'סמן כשולם ידנית'}
            </button>
            <p className="text-center text-[10px] text-muted-foreground/50 mt-1.5">
              לשימוש לאחר קבלת תשלום בפועל
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Participant Card ─────────────────────────────────────────────────────────

function ParticipantCard({
  participant, isMe, isOpen, isFirst, isTopSpender, newItemId,
  paymentMode, onRemoveItem, onAddItem, onTogglePayment,
}: {
  participant: GroupOrderParticipantFull;
  isMe: boolean;
  isOpen: boolean;
  isFirst: boolean;
  isTopSpender: boolean;
  newItemId: string | null;
  paymentMode: string;
  onRemoveItem: (itemId: string) => void;
  onAddItem: () => void;
  onTogglePayment: () => void;
}) {
  const [expanded, setExpanded] = useState(isMe);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Auto-expand when my item is new
  useEffect(() => {
    if (newItemId && participant.items.some(i => i.id === newItemId)) setExpanded(true);
  }, [newItemId, participant.items]);

  const handleRemove = async (item: GroupOrderItemFull) => {
    setRemovingId(item.id);
    onRemoveItem(item.id);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-shadow duration-200 shadow-sm ${
      isMe ? 'border-primary/50 bg-white ring-2 ring-primary/10 shadow-md' : 'border-white/80 bg-white/95 backdrop-blur-sm'
    }`}>
      {/* Header */}
      <button className="w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(e => !e)}>
        <Avatar name={participant.name} isMe={isMe} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold truncate">{participant.name}</span>
            {participant.is_host && (
              <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-px rounded-full font-bold leading-none shrink-0">מארח</span>
            )}
            {isMe && (
              <span className="text-[10px] bg-primary/12 text-primary border border-primary/25 px-1.5 py-px rounded-full font-bold leading-none shrink-0">אני</span>
            )}
            {isFirst && participant.items.length > 0 && (
              <span className="text-[10px] bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-px rounded-full font-bold leading-none shrink-0 flex items-center gap-0.5">
                <Trophy className="w-2.5 h-2.5" />ראשון
              </span>
            )}
            {isTopSpender && participant.items.length > 0 && (
              <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-px rounded-full font-bold leading-none shrink-0 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5" />מוביל
              </span>
            )}
            {/* Payment method badge */}
            {participant.payment_method === 'cash' && (
              <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-px rounded-full font-bold leading-none shrink-0 flex items-center gap-0.5">
                <Banknote className="w-2.5 h-2.5" />מזומן
              </span>
            )}
            {participant.payment_method === 'online' && participant.payment_status !== 'paid' && (
              <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-px rounded-full font-bold leading-none shrink-0 flex items-center gap-0.5">
                <CreditCard className="w-2.5 h-2.5" />אונליין
              </span>
            )}
            {participant.payment_status === 'paid' && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-px rounded-full font-bold leading-none shrink-0 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />שולם
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {participant.items.length === 0
              ? (isMe ? '👈 הוסף פריטים לסל שלך' : 'טרם הוסיף')
              : `${participant.items.length} פריטים · ${fmt(participant.subtotal)}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {participant.items.length > 0 && (
            <span className="text-sm font-black">{fmt(participant.subtotal)}</span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          {participant.items.length === 0 ? (
            <div className="text-center py-5">
              {isMe ? (
                <div className="space-y-2">
                  <p className="text-2xl">🛒</p>
                  <p className="text-xs text-muted-foreground">הסל שלך ריק</p>
                  {isOpen && (
                    <button onClick={onAddItem}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-xl transition-colors">
                      <Plus className="w-3 h-3" />הוסף פריטים עכשיו
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2">טרם הוסיף פריטים</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence initial={false}>
              {participant.items.map(item => {
                const isNew    = item.id === newItemId;
                const isRemove = removingId === item.id;
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22 }}
                    className={`flex items-center gap-2.5 py-1.5 px-2 rounded-xl transition-all duration-500 ${
                      isNew ? 'bg-emerald-50 border border-emerald-200' : ''
                    } ${isRemove ? 'opacity-40 scale-95' : ''}`}>
                    <div className="w-7 h-7 rounded-lg bg-muted/70 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-black">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.notes && <p className="text-[11px] text-muted-foreground">{item.notes}</p>}
                    </div>
                    <span className="text-sm font-bold shrink-0">{fmt(item.line_total)}</span>
                    {isMe && isOpen && (
                      <button onClick={() => handleRemove(item)} disabled={!!removingId}
                        className="w-7 h-7 rounded-xl bg-destructive/8 hover:bg-destructive/15 flex items-center justify-center transition-colors shrink-0 active:scale-90">
                        {isRemove
                          ? <div className="w-3 h-3 border border-destructive/40 border-t-destructive rounded-full animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        }
                      </button>
                    )}
                  </motion.div>
                );
              })}
              </AnimatePresence>

              {isMe && isOpen && (
                <button onClick={onAddItem}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-primary/40 text-primary text-xs font-semibold hover:bg-primary/5 transition-colors">
                  <Plus className="w-3.5 h-3.5" />הוסף עוד
                </button>
              )}
            </div>
          )}

          <PaymentRow
            participant={participant}
            isMe={isMe}
            paymentMode={paymentMode}
            onToggle={onTogglePayment}
          />
        </div>
      )}
    </div>
  );
}

// ─── Checkout & Submit Gate ───────────────────────────────────────────────────
//
// Opened by the host before the final submit.  Shows a full payment summary:
// who paid, who chose cash, who hasn't committed yet.  The actual
// submitGroupOrder() call only happens from inside this component.

function CheckoutSummary({
  groupOrder, myId, paymentMode, actionLoading,
  onClose, onMarkPaid, onMarkUnpaid, onSetMethod, onSubmit,
}: {
  groupOrder: GroupOrderFull;
  myId: string | null;
  paymentMode: string;
  actionLoading: boolean;
  onClose: () => void;
  onMarkPaid: (participantId: string) => void;
  onMarkUnpaid: (participantId: string) => void;
  onSetMethod: (method: ParticipantPaymentMethod) => void;
  onSubmit: () => void;
}) {
  const participants   = groupOrder.participants.filter(p => Number(p.subtotal) > 0);
  const allParticipants = groupOrder.participants;
  const grandTotal     = allParticipants.reduce((s, p) => s + Number(p.subtotal), 0);
  const paidTotal      = participants.filter(p => p.payment_status === 'paid').reduce((s, p) => s + Number(p.subtotal), 0);
  const cashPending    = participants.filter(p => p.payment_method === 'cash' && p.payment_status !== 'paid').reduce((s, p) => s + Number(p.subtotal), 0);
  const uncommitted    = participants.filter(p => (!p.payment_method || p.payment_method === 'none') && p.payment_status !== 'paid');

  // Steps:  1 = review  2 = confirm
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      dir="rtl"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-card/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-black">
              {step === 1 ? 'סיכום תשלומים' : 'אישור סופי'}
            </h2>
            <p className="text-xs text-muted-foreground">{groupOrder.title ?? 'הזמנה קבוצתית'}</p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted hover:bg-muted/80 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-0 shrink-0 border-b border-border/40">
        {(['סיכום תשלומים', 'שליחה למסעדה'] as const).map((label, i) => (
          <div key={label}
            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
              step === i + 1
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground/50'
            }`}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        {step === 1 ? (
          /* ── STEP 1: payment overview ─────────────────────────────── */
          <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded-2xl p-3 text-center border ${paidTotal > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-card border-border/50'}`}>
                <p className="text-base font-black text-emerald-600">{fmt(paidTotal)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">שולם</p>
              </div>
              <div className={`rounded-2xl p-3 text-center border ${cashPending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-card border-border/50'}`}>
                <p className={`text-base font-black ${cashPending > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{fmt(cashPending)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">מזומן</p>
              </div>
              <div className="rounded-2xl p-3 text-center border bg-card border-border/50">
                <p className="text-base font-black">{fmt(grandTotal)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">סה״כ</p>
              </div>
            </div>

            {/* Uncommitted warning */}
            {uncommitted.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-px" />
                <div>
                  <p className="text-xs font-bold text-amber-700">
                    {uncommitted.length} {uncommitted.length === 1 ? 'משתתף לא' : 'משתתפים לא'} בחרו אופן תשלום
                  </p>
                  <p className="text-[11px] text-amber-600/80 mt-0.5">
                    {uncommitted.map(p => p.name).join(', ')} — אפשר לשלוח בכל זאת
                  </p>
                </div>
              </div>
            )}

            {/* Per-participant rows */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-0.5">פירוט לפי משתתף</p>

              {participants.map(p => {
                const isMe     = p.id === myId;
                const statusCfg  = PAYMENT_CFG[p.payment_status] ?? PAYMENT_CFG.unpaid;
                const method   = p.payment_method ?? 'none';
                const canToggle = p.payment_status === 'unpaid' || p.payment_status === 'paid';

                return (
                  <div key={p.id} className={`rounded-2xl border overflow-hidden ${
                    isMe ? 'border-primary/30' : 'border-border/50'
                  }`}>
                    {/* Name + amount row */}
                    <div className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-primary/[0.03]' : 'bg-card'}`}>
                      <Avatar name={p.name} isMe={isMe} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold">{p.name}</span>
                          {p.is_host && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-px rounded-full font-bold">מארח</span>}
                          {isMe && <span className="text-[10px] bg-primary/12 text-primary border border-primary/25 px-1.5 py-px rounded-full font-bold">אני</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-px rounded-full border ${statusCfg.cls}`}>{statusCfg.label}</span>
                          {method === 'cash'   && <span className="text-[10px] font-bold px-1.5 py-px rounded-full border bg-amber-100 text-amber-700 border-amber-200">מזומן</span>}
                          {method === 'online' && <span className="text-[10px] font-bold px-1.5 py-px rounded-full border bg-blue-100 text-blue-700 border-blue-200">אונליין</span>}
                          {method === 'none'   && <span className="text-[10px] text-muted-foreground/60">לא נבחר</span>}
                        </div>
                      </div>
                      <span className="text-base font-black">{fmt(p.subtotal)}</span>
                    </div>

                    {/* Payment method choice — only for current user (split mode) */}
                    {isMe && paymentMode === 'split' && p.payment_status !== 'paid' && (
                      <div className="px-4 pb-3 pt-1 border-t border-border/30 bg-muted/20">
                        <p className="text-[10px] text-muted-foreground mb-2 font-medium">בחר אופן תשלום:</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSetMethod('online')}
                            className={`flex-1 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              method === 'online'
                                ? 'bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-200'
                                : 'bg-card border-border/60 text-muted-foreground hover:border-blue-300'
                            }`}>
                            <CreditCard className="w-3 h-3" />כרטיס / Bit
                          </button>
                          <button
                            onClick={() => onSetMethod('cash')}
                            className={`flex-1 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              method === 'cash'
                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200'
                                : 'bg-card border-border/60 text-muted-foreground hover:border-amber-300'
                            }`}>
                            <Banknote className="w-3 h-3" />מזומן
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Host mark-paid actions (for others) */}
                    {!isMe && canToggle && paymentMode === 'split' && (
                      <div className="px-4 pb-3 pt-1 border-t border-border/30 bg-muted/10 flex justify-end">
                        <button
                          onClick={() => p.payment_status === 'paid' ? onMarkUnpaid(p.id) : onMarkPaid(p.id)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                            p.payment_status === 'paid'
                              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                              : method === 'cash'
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600'
                          }`}>
                          {p.payment_status === 'paid' ? 'בטל סימון' : method === 'cash' ? '✓ קיבלתי מזומן' : '✓ סמן שולם'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── STEP 2: confirm & send ───────────────────────────────── */
          <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                <Send className="w-9 h-9 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black">שולחים למסעדה?</h3>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
                  ההזמנה תשלח עכשיו למטבח. לא יהיה ניתן לשנות פריטים לאחר מכן.
                </p>
              </div>
            </div>

            {/* Final summary */}
            <div className="bg-card border border-border/50 rounded-2xl divide-y divide-border/40">
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">סה״כ הזמנה</span>
                <span className="text-lg font-black">{fmt(grandTotal)}</span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">משתתפים</span>
                <span className="text-sm font-bold">{allParticipants.length}</span>
              </div>
              {paymentMode === 'split' && (
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">שולמו / ממתינים</span>
                  <span className="text-sm font-bold">
                    {participants.filter(p => p.payment_status === 'paid').length} / {participants.length}
                  </span>
                </div>
              )}
            </div>

            {uncommitted.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700">{uncommitted.length} משתתפים טרם בחרו אופן תשלום</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky footer ── */}
      <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 py-4 space-y-2.5"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        {step === 1 ? (
          <button
            onClick={() => setStep(2)}
            className="w-full h-12 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
          >
            <ArrowRight className="w-4 h-4" />
            המשך לשליחה
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onSubmit}
              disabled={actionLoading}
              className="w-full h-12 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20 disabled:opacity-60"
            >
              {actionLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Send className="w-4 h-4" />שלח הזמנה למסעדה</>
              }
            </button>
            <button onClick={() => setStep(1)}
              className="w-full h-10 bg-muted text-muted-foreground font-semibold text-sm rounded-xl hover:bg-muted/80 transition-colors">
              חזור לסיכום
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Presence Bar ─────────────────────────────────────────────────────────────

function PresenceBar({
  participants, addingNames,
}: {
  participants: GroupOrderParticipantFull[];
  addingNames: Set<string>;
}) {
  const max     = 5;
  const visible = participants.slice(0, max);
  const overflow = participants.length - max;
  const addingList = [...addingNames].slice(0, 2).join(', ');

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <div className="flex -space-x-1.5 rtl:space-x-reverse">
          {visible.map((p, i) => (
            <div key={p.id} title={p.name}
              className={`w-6 h-6 rounded-lg border-2 border-card flex items-center justify-center text-[9px] font-black text-white ${avatarColor(p.name)}`}
              style={{ zIndex: visible.length - i }}>
              {initials(p.name)}
            </div>
          ))}
          {overflow > 0 && (
            <div className="w-6 h-6 rounded-lg border-2 border-card flex items-center justify-center text-[9px] font-black text-white bg-muted-foreground/50" style={{ zIndex: 0 }}>
              +{overflow}
            </div>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">
          {participants.length}
        </span>
      </div>
      {addingList && (
        <span className="text-[10px] text-primary/80 font-semibold animate-pulse">
          {addingList} {addingNames.size === 1 ? 'מוסיף…' : 'מוסיפים…'}
        </span>
      )}
    </div>
  );
}

// ─── Order Summary ────────────────────────────────────────────────────────────

function OrderSummary({
  participants, paymentMode, myId,
}: {
  participants: GroupOrderParticipantFull[];
  paymentMode: string;
  myId: string | null;
}) {
  const withItems  = participants.filter(p => p.items.length > 0);
  const grandTotal = participants.reduce((s, p) => s + Number(p.subtotal), 0);
  const myTotal    = participants.find(p => p.id === myId)?.subtotal ?? 0;
  const topSpender = [...participants].sort((a, b) => Number(b.subtotal) - Number(a.subtotal))[0];

  if (withItems.length === 0) return null;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-2.5 border-b border-border/40 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-muted-foreground/50" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">סיכום הזמנה</p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {withItems.map(p => (
          <div key={p.id} className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${p.id === myId ? 'bg-primary' : avatarColor(p.name)}`} />
              <span className={`text-sm ${p.id === myId ? 'font-semibold' : 'text-muted-foreground'}`}>
                {p.name}
                {p.id === myId && <span className="text-xs text-muted-foreground font-normal mr-1">(אני)</span>}
              </span>
              {topSpender?.id === p.id && withItems.length > 1 && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-400" />
              )}
              {paymentMode === 'split' && (
                <span className={`text-[9px] font-bold px-1.5 py-px rounded-full border ${PAYMENT_CFG[p.payment_status]?.cls ?? ''}`}>
                  {PAYMENT_CFG[p.payment_status]?.label}
                </span>
              )}
            </div>
            <span className={`text-sm font-bold ${p.id === myId ? '' : 'text-muted-foreground'}`}>
              {fmt(p.subtotal)}
            </span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 pt-2.5 border-t border-border/40 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold">סה"כ הזמנה</span>
          <span className="text-xl font-black">{fmt(grandTotal)}</span>
        </div>
        {paymentMode === 'split' && myId && Number(myTotal) > 0 && (
          <div className="bg-primary/[0.06] border border-primary/20 rounded-xl px-3 py-2.5 flex justify-between items-center">
            <span className="text-sm font-semibold text-primary">החלק שלי לתשלום</span>
            <span className="text-xl font-black text-primary">{fmt(myTotal)}</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground text-center">
          {paymentMode === 'split' ? 'כל משתתף משלם עבור הפריטים שלו' : 'המארח משלם עבור כולם'}
        </p>
      </div>
    </div>
  );
}

// ─── Submitted Screen ─────────────────────────────────────────────────────────

function SubmittedScreen({
  orderTitle, grandTotal, myTotal, paymentMode, orderCreatedId,
}: {
  orderTitle: string | null; grandTotal: number;
  myTotal: number; paymentMode: string; orderCreatedId: string | null;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center" dir="rtl">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-200">
        <CheckCircle2 className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-2xl font-black mb-2">ההזמנה נשלחה! 🎉</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        {orderTitle ? `"${orderTitle}"` : 'ההזמנה הקבוצתית'} נשלחה למסעדה בהצלחה.
      </p>

      {grandTotal > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 w-full max-w-xs shadow-sm mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">סה"כ הזמנה</span>
            <span className="text-lg font-black">{fmt(grandTotal)}</span>
          </div>
          {paymentMode === 'split' && myTotal > 0 && (
            <div className="flex justify-between items-center pt-2.5 border-t border-border/40">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">החלק שלי</span>
              </div>
              <span className="text-lg font-black text-primary">{fmt(myTotal)}</span>
            </div>
          )}
        </div>
      )}

      {orderCreatedId && (
        <p className="text-xs text-muted-foreground/50">
          מס׳ הזמנה: {orderCreatedId.slice(0, 8).toUpperCase()}
        </p>
      )}
      <p className="text-xs text-muted-foreground/40 mt-1">תודה שהזמנת עם פנדלינה 🍣</p>
    </div>
  );
}

// ─── Page Loading ─────────────────────────────────────────────────────────────

function PageLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <div className="h-14 bg-card/95 border-b border-border/60 px-4 flex items-center gap-3 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded-lg w-28" />
          <div className="h-2.5 bg-muted rounded-lg w-20" />
        </div>
        <div className="flex -space-x-1.5 rtl:space-x-reverse">
          {[0,1,2].map(i => <div key={i} className="w-6 h-6 rounded-lg bg-muted border-2 border-card" />)}
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3 w-full">
        <div className="h-20 bg-muted/40 animate-pulse rounded-2xl" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroupOrderRoom() {
  const { token } = useParams<{ token: string }>();

  const [groupOrder,      setGroupOrder]     = useState<GroupOrderFull | null>(null);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState<string | null>(null);
  const [participantId,   setParticipantId]  = useState<string | null>(null);
  const [showAddItem,     setShowAddItem]    = useState(false);
  const [actionLoading,   setActionLoading]  = useState(false);
  const [expiry,          setExpiry]         = useState<string | null>(null);
  const [copiedLink,      setCopiedLink]     = useState(false);
  const [newItemId,       setNewItemId]      = useState<string | null>(null);
  const [sessionCount,    setSessionCount]   = useState(0);
  const [addingNames,     setAddingNames]    = useState<Set<string>>(new Set());
  const [createdOrderId,  setCreatedOrderId] = useState<string | null>(null);
  const [payNowTarget,    setPayNowTarget]   = useState<GroupOrderParticipantFull | null>(null);
  const [showCheckout,    setShowCheckout]   = useState(false);

  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const newItemTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Session restore ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const stored = sessionStorage.getItem(`go_pid_${token}`);
    if (stored) setParticipantId(stored);
  }, [token]);

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadGroupOrder = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchGroupOrderFull(token);
      setGroupOrder(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת ההזמנה');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadGroupOrder(); }, [loadGroupOrder]);

  // ── Expiry countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!groupOrder?.expires_at) return;
    const tick = () => setExpiry(formatExpiry(groupOrder.expires_at));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [groupOrder?.expires_at]);

  // ── Realtime — postgres_changes ────────────────────────────────────────────
  useEffect(() => {
    if (!groupOrder?.id) return;
    let timer: ReturnType<typeof setTimeout>;
    const reload = () => { clearTimeout(timer); timer = setTimeout(loadGroupOrder, 300); };

    const ch = supabase
      .channel(`go-room-${groupOrder.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_orders',             filter: `id=eq.${groupOrder.id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_order_items',        filter: `group_order_id=eq.${groupOrder.id}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_order_participants', filter: `group_order_id=eq.${groupOrder.id}` }, reload)
      .subscribe();

    channelRef.current = ch;
    return () => { clearTimeout(timer); supabase.removeChannel(ch); };
  }, [groupOrder?.id, loadGroupOrder]);

  // ── Presence broadcast — "X is adding…" ───────────────────────────────────
  const handleBroadcastAdding = useCallback((active: boolean) => {
    if (!groupOrder?.id || !participantId) return;
    const myName = groupOrder.participants.find(p => p.id === participantId)?.name;
    if (!myName) return;

    if (!presenceRef.current) {
      const ch = supabase.channel(`go-presence-${groupOrder.id}`);
      ch.on('broadcast', { event: 'adding' }, ({ payload }: { payload: { name: string; active: boolean } }) => {
        setAddingNames(prev => {
          const next = new Set(prev);
          if (payload.active) next.add(payload.name);
          else next.delete(payload.name);
          return next;
        });
      }).subscribe();
      presenceRef.current = ch;
    }

    presenceRef.current.send({ type: 'broadcast', event: 'adding', payload: { name: myName, active } });
    if (!active) setAddingNames(prev => { const n = new Set(prev); n.delete(myName); return n; });
  }, [groupOrder, participantId]);

  useEffect(() => () => {
    if (presenceRef.current) supabase.removeChannel(presenceRef.current);
  }, []);

  // ── New item highlight timeout ─────────────────────────────────────────────
  useEffect(() => {
    if (!newItemId) return;
    clearTimeout(newItemTimer.current);
    newItemTimer.current = setTimeout(() => setNewItemId(null), 2500);
    return () => clearTimeout(newItemTimer.current);
  }, [newItemId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const myParticipant  = useMemo(() =>
    groupOrder && participantId ? (groupOrder.participants.find(p => p.id === participantId) ?? null) : null,
    [groupOrder, participantId]);

  const isOpen     = groupOrder?.status === 'open';
  const isHost     = myParticipant?.is_host ?? false;
  const grandTotal = groupOrder?.participants.reduce((s, p) => s + Number(p.subtotal), 0) ?? 0;
  const myTotal    = Number(myParticipant?.subtotal ?? 0);
  const myItemCount = myParticipant?.items.length ?? 0;
  const totalItems = groupOrder?.participants.reduce((s, p) => s + p.items.length, 0) ?? 0;
  const shareUrl   = typeof window !== 'undefined' ? `${window.location.origin}/group/${token}` : '';
  const otherParticipants = groupOrder?.participants.filter(p => p.id !== participantId) ?? [];
  const firstWithItems = useMemo(() =>
    groupOrder?.participants.find(p => p.items.length > 0),
    [groupOrder]);
  const topSpender = useMemo(() =>
    [...(groupOrder?.participants ?? [])].sort((a, b) => Number(b.subtotal) - Number(a.subtotal))[0],
    [groupOrder]);

  // ── Copy / share ──────────────────────────────────────────────────────────
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast({ title: 'הקישור הועתק!', description: 'שתף עם חברים כדי שיצטרפו' });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast({ title: 'שגיאה', description: 'לא ניתן להעתיק', variant: 'destructive' });
    }
  };

  const shareWhatsApp = () => {
    const title = groupOrder?.title ? ` "${groupOrder.title}"` : '';
    window.open(`https://wa.me/?text=${encodeURIComponent(`הי! הצטרפו להזמנה הקבוצתית${title} 🍣\n${shareUrl}`)}`, '_blank');
  };

  // ── Add item — optimistic ─────────────────────────────────────────────────
  const handleAddItem = useCallback(async (item: AddItemInput) => {
    if (!groupOrder || !participantId) return;

    const lineTotal = item.quantity * item.unitPrice;
    const tempId    = `_opt_${Date.now()}`;

    // Optimistic insert
    setGroupOrder(go => {
      if (!go) return go;
      return {
        ...go,
        participants: go.participants.map(p =>
          p.id !== participantId ? p : {
            ...p,
            subtotal: Number(p.subtotal) + lineTotal,
            items: [...p.items, {
              id: tempId,
              group_order_id: go.id,
              participant_id: participantId,
              menu_item_id: item.menuItemId ?? null,
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              line_total: lineTotal,
              notes: item.notes ?? null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              options: [],
            }],
          }
        ),
      };
    });
    setNewItemId(tempId);
    setSessionCount(c => c + 1);

    try {
      const realId = await addItem(groupOrder.id, participantId, item);
      // Swap temp ID for real ID in state
      setGroupOrder(go => {
        if (!go) return go;
        return {
          ...go,
          participants: go.participants.map(p =>
            p.id !== participantId ? p : {
              ...p,
              items: p.items.map(i => i.id === tempId ? { ...i, id: realId } : i),
            }
          ),
        };
      });
      setNewItemId(realId);
      toast({ title: 'נוסף לסל שלך 🛒', description: item.name });
    } catch (err: unknown) {
      // Rollback
      setGroupOrder(go => {
        if (!go) return go;
        return {
          ...go,
          participants: go.participants.map(p =>
            p.id !== participantId ? p : {
              ...p,
              subtotal: Number(p.subtotal) - lineTotal,
              items: p.items.filter(i => i.id !== tempId),
            }
          ),
        };
      });
      setNewItemId(null);
      setSessionCount(c => Math.max(0, c - 1));
      toast({ title: 'שגיאה בהוספה', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  }, [groupOrder, participantId]);

  // ── Remove item — optimistic ──────────────────────────────────────────────
  const handleRemoveItem = useCallback((itemId: string) => {
    if (!participantId || !groupOrder) return;

    // Find item for rollback
    const myP    = groupOrder.participants.find(p => p.id === participantId);
    const target = myP?.items.find(i => i.id === itemId);
    if (!target) return;

    const lineTotal = Number(target.line_total);

    // Optimistic remove
    setGroupOrder(go => {
      if (!go) return go;
      return {
        ...go,
        participants: go.participants.map(p =>
          p.id !== participantId ? p : {
            ...p,
            subtotal: Math.max(0, Number(p.subtotal) - lineTotal),
            items: p.items.filter(i => i.id !== itemId),
          }
        ),
      };
    });

    removeItem(itemId, participantId)
      .then(() => toast({ title: 'הוסר מהסל', description: target.name }))
      .catch((err: unknown) => {
        // Rollback: reload from server
        loadGroupOrder();
        toast({ title: 'שגיאה בהסרה', description: err instanceof Error ? err.message : '', variant: 'destructive' });
      });
  }, [groupOrder, participantId, loadGroupOrder]);

  // ── Toggle payment ────────────────────────────────────────────────────────
  const handleTogglePayment = useCallback(async () => {
    if (!participantId || !myParticipant) return;
    const isPaid = myParticipant.payment_status === 'paid';

    // Optimistic
    setGroupOrder(go => {
      if (!go) return go;
      return {
        ...go,
        participants: go.participants.map(p =>
          p.id !== participantId ? p : {
            ...p, payment_status: isPaid ? 'unpaid' : 'paid',
          }
        ),
      };
    });

    try {
      if (isPaid) {
        await markParticipantUnpaid(participantId);
      } else {
        await markParticipantPaid(participantId);
        toast({ title: 'תשלום סומן ✓', description: 'הסטטוס עודכן' });
      }
    } catch {
      loadGroupOrder(); // rollback via server
    }
  }, [participantId, myParticipant, loadGroupOrder]);

  // ── Set payment method ────────────────────────────────────────────────────
  const handleSetPaymentMethod = useCallback(async (method: ParticipantPaymentMethod) => {
    if (!participantId) return;
    // Optimistic
    setGroupOrder(go => {
      if (!go) return go;
      return {
        ...go,
        participants: go.participants.map(p =>
          p.id !== participantId ? p : { ...p, payment_method: method }
        ),
      };
    });
    try {
      await setParticipantPaymentMethod(participantId, method);
      toast({ title: method === 'cash' ? '💵 סומן כמזומן' : '💳 אונליין נבחר', description: '' });
    } catch {
      loadGroupOrder();
    }
  }, [participantId, loadGroupOrder]);

  // ── Host: mark any participant paid / unpaid ──────────────────────────────
  const handleHostMarkPaid = useCallback(async (pid: string) => {
    setGroupOrder(go => {
      if (!go) return go;
      return { ...go, participants: go.participants.map(p => p.id !== pid ? p : { ...p, payment_status: 'paid' as const }) };
    });
    try {
      await markParticipantPaid(pid);
    } catch { loadGroupOrder(); }
  }, [loadGroupOrder]);

  const handleHostMarkUnpaid = useCallback(async (pid: string) => {
    setGroupOrder(go => {
      if (!go) return go;
      return { ...go, participants: go.participants.map(p => p.id !== pid ? p : { ...p, payment_status: 'unpaid' as const }) };
    });
    try {
      await markParticipantUnpaid(pid);
    } catch { loadGroupOrder(); }
  }, [loadGroupOrder]);

  // ── Lock ──────────────────────────────────────────────────────────────────
  const handleLock = async () => {
    if (!groupOrder || !participantId) return;
    setActionLoading(true);
    try {
      await lockGroupOrder(groupOrder.id, participantId);
      await loadGroupOrder();
      toast({ title: '🔒 ההזמנה ננעלה', description: 'לא ניתן עוד לשנות פריטים' });
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!groupOrder) return;
    setActionLoading(true);
    try {
      const orderId = await submitGroupOrder(groupOrder.id);
      setCreatedOrderId(orderId);
      await loadGroupOrder();
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally { setActionLoading(false); }
  };

  // ── Guard renders ─────────────────────────────────────────────────────────

  if (loading) return <PageLoading />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-bold">לא ניתן לטעון את ההזמנה</h2>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <button onClick={() => { setError(null); setLoading(true); loadGroupOrder(); }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <RotateCcw className="w-3.5 h-3.5" />נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (!groupOrder) return null;

  if (!participantId) {
    return (
      <JoinModal
        token={token!}
        orderTitle={groupOrder.title}
        hostName={groupOrder.host_name}
        participantCount={groupOrder.participants.length}
        onJoined={pid => { setParticipantId(pid); loadGroupOrder(); }}
      />
    );
  }

  if (groupOrder.status === 'submitted') {
    return (
      <SubmittedScreen
        orderTitle={groupOrder.title}
        grandTotal={grandTotal}
        myTotal={myTotal}
        paymentMode={groupOrder.payment_mode}
        orderCreatedId={createdOrderId}
      />
    );
  }

  const statusCfg = STATUS_CFG[groupOrder.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.open;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen pb-44 overflow-x-hidden" dir="rtl">

      {/* ── Full-page background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <img
          src="/group-order-hero.png"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        {/* Very light overlay — keeps background visible but content readable */}
        <div className="absolute inset-0 bg-white/82 backdrop-blur-[2px]" />
      </div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 rounded-full bg-orange-100/30 blur-3xl -z-10 pointer-events-none" aria-hidden="true" />

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-border/40 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Minimal left side: status + truncated title */}
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
              <span className="text-sm font-bold text-foreground truncate">
                {groupOrder.title ?? 'הזמנה קבוצתית'}
              </span>
              {expiry && (
                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 shrink-0">
                  <Clock className="w-2.5 h-2.5" />{expiry}
                </span>
              )}
            </div>
            <PresenceBar participants={groupOrder.participants} addingNames={addingNames} />
          </div>
        </div>
      </div>

      {/* ── Locked banner ──────────────────────────────────────────────────── */}
      {groupOrder.status === 'locked' && (
        <div className="bg-amber-50/95 backdrop-blur-sm border-b border-amber-200 px-4 py-2.5">
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">ההזמנה ננעלה — ממתין לשליחה</p>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* ── Share ──────────────────────────────────────────────────────────── */}
        {isOpen && (
          <div className="bg-white/95 backdrop-blur-sm border border-primary/20 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-foreground/70 mb-2.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary/60" />שתף קישור עם חברים
            </p>
            <div className="flex gap-2">
              <button onClick={shareWhatsApp}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#20BD5A] active:scale-95 transition-all">
                <MessageCircle className="w-4 h-4" />WhatsApp
              </button>
              <button onClick={copyLink}
                className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl border text-sm font-bold active:scale-95 transition-all ${
                  copiedLink ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-card border-border/60 hover:bg-muted'
                }`}>
                {copiedLink ? <><CheckCircle2 className="w-3.5 h-3.5" />הועתק!</> : <><Link2 className="w-3.5 h-3.5" />העתק קישור</>}
              </button>
            </div>
          </div>
        )}

        {/* ── My section ─────────────────────────────────────────────────────── */}
        {myParticipant && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-bold text-foreground/70 uppercase tracking-wide">ההזמנה שלי</p>
              {myItemCount > 0 && <span className="text-xs font-bold text-primary">{fmt(myTotal)}</span>}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ParticipantCard
                participant={myParticipant}
                isMe
                isOpen={isOpen}
                isFirst={firstWithItems?.id === myParticipant.id}
                isTopSpender={topSpender?.id === myParticipant.id && (groupOrder.participants.filter(p => p.items.length > 0).length > 1)}
                newItemId={newItemId}
                paymentMode={groupOrder.payment_mode}
                onRemoveItem={handleRemoveItem}
                onAddItem={() => setShowAddItem(true)}
                onTogglePayment={handleTogglePayment}
              />
            </motion.div>
          </section>
        )}

        {/* ── Others ─────────────────────────────────────────────────────────── */}
        {otherParticipants.length > 0 && (
          <section>
            <p className="text-xs font-bold text-foreground/70 uppercase tracking-wide mb-2 px-1">
              משתתפים אחרים · {otherParticipants.length}
            </p>
            <AnimatePresence initial={false}>
              <div className="space-y-2">
                {otherParticipants.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.28, delay: i * 0.04 }}
                  >
                    <ParticipantCard
                      participant={p}
                      isMe={false}
                      isOpen={isOpen}
                      isFirst={firstWithItems?.id === p.id}
                      isTopSpender={topSpender?.id === p.id && (groupOrder.participants.filter(x => x.items.length > 0).length > 1)}
                      newItemId={newItemId}
                      paymentMode={groupOrder.payment_mode}
                      onRemoveItem={handleRemoveItem}
                      onAddItem={() => setShowAddItem(true)}
                      onTogglePayment={() => {}}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </section>
        )}

        {/* ── Summary ────────────────────────────────────────────────────────── */}
        <OrderSummary
          participants={groupOrder.participants}
          paymentMode={groupOrder.payment_mode}
          myId={participantId}
        />

        {/* ── Last-updated row ───────────────────────────────────────────────── */}
        <p className="text-center text-[11px] text-muted-foreground/40 pb-2">
          עודכן {timeAgo(groupOrder.updated_at)}
        </p>

      </div>

      {/* ── Sticky bottom bar ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur-md border-t border-amber-100/70 shadow-t shadow-amber-100/30"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className="max-w-lg mx-auto px-4 pt-3 pb-1 space-y-2">

          {/* Pay Now CTA — split mode, has items, order submitted or locked */}
          {groupOrder.payment_mode === 'split' && myParticipant && Number(myParticipant.subtotal) > 0 && (groupOrder.status === 'locked' || groupOrder.status === 'submitted') && (
            <button
              onClick={() => setPayNowTarget(myParticipant)}
              className={`w-full h-12 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all shadow-sm ${
                myParticipant.payment_status === 'paid'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              {myParticipant.payment_status === 'paid' ? `שולם ✓ · ${fmt(myParticipant.subtotal)}` : `שלם עכשיו · ${fmt(myParticipant.subtotal)}`}
            </button>
          )}

          {/* Add items FAB */}
          {isOpen && myParticipant && (
            <button onClick={() => setShowAddItem(true)}
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-sm shadow-primary/20">
              <Plus className="w-4.5 h-4.5" />
              הוסף פריטים לסל שלי
              {myItemCount > 0 && (
                <span className="bg-white/20 text-primary-foreground text-xs font-black px-2 py-0.5 rounded-full">
                  {myItemCount}
                </span>
              )}
            </button>
          )}

          {/* Host actions — open/locked */}
          {isHost && (groupOrder.status === 'open' || groupOrder.status === 'locked') && (
            <div className="flex gap-2">
              {groupOrder.status === 'open' && (
                <Button variant="outline" onClick={handleLock} disabled={actionLoading}
                  className="flex-1 h-11 font-bold text-sm gap-1.5 rounded-xl border-border/60">
                  <Lock className="w-3.5 h-3.5" />נעל הזמנה
                </Button>
              )}
              {/* Opens CheckoutSummary — submit happens from there, not here */}
              <Button
                onClick={() => setShowCheckout(true)}
                disabled={totalItems === 0}
                className="flex-1 h-11 font-bold text-sm gap-1.5 rounded-xl shadow-sm shadow-primary/20"
              >
                <Receipt className="w-3.5 h-3.5" />
                {groupOrder.payment_mode === 'split' ? 'סיים ולשלם' : 'סיים הזמנה'}
              </Button>
            </div>
          )}

          {/* Host: re-open checkout after submission for payment tracking */}
          {isHost && groupOrder.status === 'submitted' && (
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full h-11 flex items-center justify-center gap-2 text-sm font-bold rounded-xl bg-card border border-border/60 hover:bg-muted/50 transition-colors"
            >
              <Receipt className="w-4 h-4" />
              סגירת חשבון
              {groupOrder.participants.some(p => p.payment_status === 'unpaid' && Number(p.subtotal) > 0) && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {groupOrder.participants.filter(p => p.payment_status === 'unpaid' && Number(p.subtotal) > 0).length}
                </span>
              )}
            </button>
          )}

          {/* Totals strip */}
          <div className="flex justify-between items-center pt-0.5 pb-0.5">
            <span className="text-xs text-muted-foreground">
              {totalItems} פריטים · {groupOrder.participants.length} משתתפים
            </span>
            <span className="text-sm font-black">{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Add Item Modal ──────────────────────────────────────────────────── */}
      {showAddItem && (
        <AddItemModal
          restaurantId={groupOrder.restaurant_id}
          sessionCount={sessionCount}
          onAdd={handleAddItem}
          onBroadcastAdding={handleBroadcastAdding}
          onClose={() => setShowAddItem(false)}
        />
      )}

      {/* ── Pay Now Modal ───────────────────────────────────────────────────── */}
      {payNowTarget && (
        <PayNowModal
          participant={payNowTarget}
          onClose={() => setPayNowTarget(null)}
          onToggle={handleTogglePayment}
          onSetMethod={handleSetPaymentMethod}
        />
      )}

      {/* ── Checkout Summary / Submit Gate ──────────────────────────────────── */}
      <AnimatePresence>
        {showCheckout && (
          <CheckoutSummary
            groupOrder={groupOrder}
            myId={participantId}
            paymentMode={groupOrder.payment_mode}
            actionLoading={actionLoading}
            onClose={() => setShowCheckout(false)}
            onMarkPaid={handleHostMarkPaid}
            onMarkUnpaid={handleHostMarkUnpaid}
            onSetMethod={handleSetPaymentMethod}
            onSubmit={() => { handleSubmit(); setShowCheckout(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
