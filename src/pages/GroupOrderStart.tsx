import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createGroupOrder } from '@/services/groupOrderService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Users, Clock, CreditCard, UserRound, Phone, Tag,
  ArrowRight, ChevronRight, Banknote, UtensilsCrossed,
} from 'lucide-react';
import type { PaymentMode } from '@/types/groupOrder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const EXPIRE_OPTIONS = [
  { value: 1,  label: 'שעה' },
  { value: 2,  label: 'שעתיים' },
  { value: 4,  label: '4 שעות' },
  { value: 8,  label: '8 שעות' },
];

// ─── Input validators ─────────────────────────────────────────────────────────

/** Phone: allow only digits, spaces, +, -, (, ) */
function sanitizePhone(v: string) {
  return v.replace(/[^\d\s+\-()]/g, '');
}

/** Name: no digits allowed */
function sanitizeName(v: string) {
  return v.replace(/\d/g, '');
}

// ─── Floating bubbles (decorative) ───────────────────────────────────────────

const BUBBLES = [
  { emoji: '🍣', top: '12%', right: '8%',  delay: '0s',    dur: '3.2s',  size: 'text-3xl' },
  { emoji: '🍜', top: '28%', left: '6%',   delay: '0.8s',  dur: '4s',    size: 'text-2xl' },
  { emoji: '📱', top: '8%',  left: '18%',  delay: '1.4s',  dur: '3.6s',  size: 'text-2xl' },
  { emoji: '🥟', top: '55%', right: '5%',  delay: '0.4s',  dur: '4.2s',  size: 'text-2xl' },
  { emoji: '🎉', top: '45%', left: '4%',   delay: '1.8s',  dur: '3.8s',  size: 'text-xl'  },
  { emoji: '🍱', top: '70%', right: '10%', delay: '2.2s',  dur: '3.4s',  size: 'text-xl'  },
];

export default function GroupOrderStart() {
  const { slug }     = useParams<{ slug: string }>();
  const navigate     = useNavigate();

  const [hostName, setHostName]       = useState('');
  const [hostPhone, setHostPhone]     = useState('');
  const [title, setTitle]             = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('split');
  const [expiresIn, setExpiresIn]     = useState<number>(2);
  const [loading, setLoading]         = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);

    if (!hostName.trim()) {
      toast({ title: 'שדה חובה', description: 'נא להזין את שמך', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: restData, error: restError } = await db
        .from('restaurants').select('id').eq('slug', slug).single();

      if (restError || !restData) throw new Error('המסעדה לא נמצאה');

      const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString();
      const { groupOrder, participantId } = await createGroupOrder(
        restData.id as string,
        hostName.trim(),
        hostPhone.trim() || undefined,
        title.trim()    || undefined,
        paymentMode,
        expiresAt,
      );

      sessionStorage.setItem(`go_pid_${groupOrder.share_token}`, participantId);
      navigate(`/group/${groupOrder.share_token}`);
    } catch (err: unknown) {
      toast({ title: 'שגיאה', description: err instanceof Error ? err.message : 'שגיאה בלתי צפויה', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden" dir="rtl">

      {/* ── Full-page background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <img
          src="/group-order-hero.png"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        {/* Dark + color overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/75 via-black/55 to-amber-900/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
      </div>

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-5 pt-12 pb-8 relative">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-10 transition-colors font-medium"
        >
          <ChevronRight className="w-4 h-4" />
          חזרה לתפריט
        </Link>

        {/* Avatars row */}
        <div className="flex items-center gap-2 mb-5">
          {['👩', '👨', '🧑', '👩‍🦱'].map((p, i) => (
            <div key={i}
              className="w-11 h-11 rounded-full bg-white/25 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-xl shadow-lg"
              style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 4 - i }}>
              {p}
            </div>
          ))}
          <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-[11px] font-black text-white shadow-lg"
            style={{ marginLeft: '-8px' }}>
            +12
          </div>
          <span className="text-white font-semibold text-sm mr-3 drop-shadow">מזמינים ביחד</span>
        </div>

        <h1 className="text-4xl font-black text-white leading-tight mb-3 drop-shadow-lg">
          הזמנה קבוצתית 🎉
        </h1>
        <p className="text-white/90 text-base leading-relaxed font-medium drop-shadow">
          כל אחד בוחר מה שהוא רוצה — הכל מגיע יחד.<br />
          שתף קישור עם חברים ותנו לאוכל להגיע!
        </p>

        {/* Social proof chips */}
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          {['⚡ מהיר ופשוט', '🔗 שתף קישור', '💳 כל אחד משלם'].map(chip => (
            <span key={chip} className="bg-white/20 backdrop-blur-sm border border-white/40 rounded-full px-3.5 py-1.5 text-sm text-white font-semibold shadow-sm">
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* ── Form card ─────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pb-12 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Title */}
          <div className="bg-white backdrop-blur-sm border border-white/80 rounded-2xl p-4 space-y-3 shadow-xl shadow-black/20">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">שם ההזמנה</span>
              <span className="text-xs text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded-md">אופציונלי</span>
            </div>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="למשל: ארוחת שישי של הצוות 🍣"
              className="text-sm bg-white/80"
            />
          </div>

          {/* Host info */}
          <div className="bg-white backdrop-blur-sm border border-white/80 rounded-2xl p-4 space-y-3 shadow-xl shadow-black/20">
            <div className="flex items-center gap-2">
              <UserRound className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">פרטי המארח</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hostName" className="text-xs text-muted-foreground">
                שם מלא <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hostName"
                value={hostName}
                onChange={e => setHostName(sanitizeName(e.target.value))}
                onBlur={() => setNameTouched(true)}
                placeholder="השם שלך"
                required
                inputMode="text"
                autoComplete="name"
                className={`text-sm bg-white/80 ${nameTouched && !hostName.trim() ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              {nameTouched && !hostName.trim() && (
                <p className="text-xs text-destructive">שם חובה</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hostPhone" className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> טלפון
                <span className="text-muted-foreground/50 mr-1">(לתיאום אם צריך)</span>
              </Label>
              <Input
                id="hostPhone"
                type="tel"
                inputMode="tel"
                value={hostPhone}
                onChange={e => setHostPhone(sanitizePhone(e.target.value))}
                placeholder="05X-XXXXXXX"
                className="text-sm bg-white/80"
                dir="ltr"
                autoComplete="tel"
                maxLength={15}
              />
            </div>
          </div>

          {/* Payment mode */}
          <div className="bg-white backdrop-blur-sm border border-white/80 rounded-2xl p-4 space-y-3 shadow-xl shadow-black/20">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">אופן תשלום</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                {
                  value: 'split' as PaymentMode,
                  label: 'כל אחד משלם',
                  sub: 'כל משתתף משלם עבור הזמנתו',
                  icon: <Users className="w-4 h-4" />,
                },
                {
                  value: 'host_pays_all' as PaymentMode,
                  label: 'המארח משלם הכל',
                  sub: 'המארח מכסה את כל ההזמנה',
                  icon: <Banknote className="w-4 h-4" />,
                },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMode(opt.value)}
                  className={`text-right p-3.5 rounded-xl border-2 transition-all ${
                    paymentMode === opt.value
                      ? 'border-primary bg-primary/8 shadow-sm'
                      : 'border-border/40 hover:border-primary/30 bg-white/50'
                  }`}
                >
                  <div className={`mb-1.5 ${paymentMode === opt.value ? 'text-primary' : 'text-muted-foreground'}`}>
                    {opt.icon}
                  </div>
                  <p className={`font-bold text-xs leading-tight ${paymentMode === opt.value ? 'text-primary' : 'text-foreground'}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div className="bg-white backdrop-blur-sm border border-white/80 rounded-2xl p-4 space-y-3 shadow-xl shadow-black/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">תוקף ההזמנה</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {EXPIRE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpiresIn(opt.value)}
                  className={`py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    expiresIn === opt.value
                      ? 'border-primary bg-primary/8 text-primary shadow-sm'
                      : 'border-border/40 text-foreground hover:border-primary/30 bg-white/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-14 text-base font-black rounded-2xl gap-2 shadow-lg shadow-primary/30 bg-white text-primary hover:bg-white/90 transition-all active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                יוצר הזמנה...
              </span>
            ) : (
              <>
                <UtensilsCrossed className="w-5 h-5" />
                צור הזמנה קבוצתית
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <p className="text-center text-sm text-white/80 pb-2 font-medium drop-shadow">
            לאחר היצירה תקבל קישור לשיתוף עם חברים
          </p>
        </form>
      </div>
    </div>
  );
}
