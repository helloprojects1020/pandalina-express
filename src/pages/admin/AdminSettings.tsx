import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, Store, ShoppingBag, Clock, Package, CreditCard, Check, Sparkles } from 'lucide-react';
import { PageHeader, SectionCard, LoadingState } from '@/components/admin/AdminUI';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { PLAN_RANK, type PlanSlug } from '@/types/featureFlags';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface SettingsForm {
  whatsapp_number: string;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  dine_in_enabled: boolean;
  delivery_fee: number;
  min_order_amount: number;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>;
  inventory_tracking_enabled: boolean;
  out_of_stock_ui_enabled: boolean;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
};

const defaultHours = () => Object.fromEntries(
  DAYS.map(d => [d, { open: '11:00', close: '23:00', closed: d === 'saturday' }])
);

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS: {
  slug: PlanSlug;
  name: string;
  price: string;
  description: string;
  features: string[];
  badge: string;
  border: string;
}[] = [
  {
    slug: 'free',
    name: 'Free',
    price: 'חינם',
    description: 'מנהלי תפריט והזמנות בסיסי',
    badge:  'bg-slate-100 text-slate-700 border-slate-200',
    border: 'border-slate-200',
    features: ['הזמנות', 'ניהול תפריט'],
  },
  {
    slug: 'pro',
    name: 'Pro',
    price: '₪149 / חודש',
    description: 'חבילה מלאה לתפעול מסעדה צומחת',
    badge:  'bg-blue-100 text-blue-700 border-blue-300',
    border: 'border-blue-300',
    features: ['הכל ב-Free', 'לקוחות', 'אזורי משלוח', 'אנליטיקה', 'מלאי', 'דוחות X/Z', 'דוח יומי', 'צוות', 'ביצועי תפריט', 'ייצוא'],
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: '₪499 / חודש',
    description: 'אוטומציה ודוחות מתקדמים',
    badge:  'bg-purple-100 text-purple-700 border-purple-300',
    border: 'border-purple-300',
    features: ['הכל ב-Pro', 'עלויות ורווחיות', 'אוטומציה WhatsApp', 'אנליטיקה מתקדמת'],
  },
];

// ── Subscription section ──────────────────────────────────────────────────────

function SubscriptionSection() {
  const { plan } = useFeatureFlags();
  const currentRank = PLAN_RANK[plan];

  return (
    <SectionCard title="מנוי ותוכנית" icon={CreditCard}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map(p => {
          const isCurrent  = p.slug === plan;
          const isUpgrade  = PLAN_RANK[p.slug] > currentRank;
          const isDowngrade = PLAN_RANK[p.slug] < currentRank;
          return (
            <div
              key={p.slug}
              className={`relative rounded-2xl border-2 p-5 space-y-3 transition-shadow ${
                isCurrent
                  ? `${p.border} shadow-md`
                  : 'border-border/50 hover:border-border'
              }`}
            >
              {isCurrent && (
                <span className={`absolute top-3 left-3 text-[10px] font-black px-2 py-0.5 rounded-full border ${p.badge}`}>
                  התוכנית שלך
                </span>
              )}
              <div className="pt-4">
                <p className="font-black text-foreground text-base flex items-center gap-1.5">
                  {p.slug !== 'free' && <Sparkles className="w-3.5 h-3.5 text-yellow-500" />}
                  {p.name}
                </p>
                <p className="text-lg font-bold text-foreground mt-0.5">{p.price}</p>
                <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
              </div>

              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isUpgrade && (
                <a
                  href={`mailto:hello@bitelyx.com?subject=שדרוג לתוכנית ${p.name}`}
                  className={`flex items-center justify-center gap-1.5 w-full mt-2 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors ${
                    p.slug === 'pro' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'
                  }`}
                >
                  שדרג ל-{p.name}
                </a>
              )}
              {isDowngrade && (
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  לשינוי תוכנית צור קשר
                </p>
              )}
              {isCurrent && (
                <p className="text-[11px] text-green-600 font-semibold text-center pt-1">
                  פעיל
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        לשאלות ושדרוג:{' '}
        <a href="mailto:hello@bitelyx.com" className="text-blue-600 hover:underline font-medium">
          hello@bitelyx.com
        </a>
      </p>
    </SectionCard>
  );
}

const SaveButton = ({ onClick, saving }: { onClick: () => void; saving: boolean }) => (
  <Button onClick={onClick} disabled={saving}>
    {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
    שמור
  </Button>
);

const AdminSettings = () => {
  const { restaurantId } = useAuth();
  const [form, setForm] = useState<SettingsForm>({
    whatsapp_number: '', delivery_enabled: true, pickup_enabled: true,
    dine_in_enabled: true, delivery_fee: 0, min_order_amount: 0,
    opening_hours: defaultHours(),
    inventory_tracking_enabled: false,
    out_of_stock_ui_enabled: false,
  });
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');

  // ── Load: only from restaurant_settings ─────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: s } = await db
        .from('restaurant_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (s) {
        setRestaurantName(s.name ?? '');
        setRestaurantPhone(s.phone ?? '');
        setForm({
          whatsapp_number:  s.whatsapp_number ?? '',
          delivery_enabled: s.is_delivery_enabled ?? true,
          pickup_enabled:   s.is_pickup_enabled   ?? true,
          dine_in_enabled:  s.is_dine_in_enabled  ?? true,
          delivery_fee:     Number(s.delivery_fee  ?? 0),
          min_order_amount: Number(s.minimum_order ?? 0),
          opening_hours:    (s.opening_hours as SettingsForm['opening_hours']) ?? defaultHours(),
          inventory_tracking_enabled: s.inventory_tracking_enabled ?? false,
          out_of_stock_ui_enabled:    s.out_of_stock_ui_enabled    ?? false,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [restaurantId]);

  // ── Save: only to restaurant_settings ───────────────────────────────────────
  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);

    const { error } = await db.from('restaurant_settings').upsert({
      restaurant_id:               restaurantId,
      name:                        restaurantName,
      phone:                       restaurantPhone,
      whatsapp_number:             form.whatsapp_number,
      is_delivery_enabled:         form.delivery_enabled,
      is_pickup_enabled:           form.pickup_enabled,
      is_dine_in_enabled:          form.dine_in_enabled,
      delivery_fee:                form.delivery_fee,
      minimum_order:               form.min_order_amount,
      opening_hours:               form.opening_hours,
      inventory_tracking_enabled:  form.inventory_tracking_enabled,
      out_of_stock_ui_enabled:     form.out_of_stock_ui_enabled,
      updated_at:                  new Date().toISOString(),
    }, { onConflict: 'restaurant_id' });

    if (error) {
      toast({ title: 'שגיאה בשמירה', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'ההגדרות נשמרו ✅' });
    }
    setSaving(false);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <PageHeader
        title="הגדרות"
        actions={<SaveButton onClick={handleSave} saving={saving} />}
      />

      <SubscriptionSection />

      <SectionCard title="פרטי המסעדה" icon={Store}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>שם המסעדה</Label>
            <Input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>טלפון</Label>
            <Input value={restaurantPhone} onChange={e => setRestaurantPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>מספר WhatsApp</Label>
            <Input
              value={form.whatsapp_number}
              onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              placeholder="972526204159"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="סוגי הזמנה" icon={ShoppingBag}>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">משלוח</span>
            <Switch checked={form.delivery_enabled} onCheckedChange={v => setForm(f => ({ ...f, delivery_enabled: v }))} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">איסוף עצמי</span>
            <Switch checked={form.pickup_enabled} onCheckedChange={v => setForm(f => ({ ...f, pickup_enabled: v }))} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">ישיבה במקום</span>
            <Switch checked={form.dine_in_enabled} onCheckedChange={v => setForm(f => ({ ...f, dine_in_enabled: v }))} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-1">
            <Label>דמי משלוח (₪)</Label>
            <Input type="number" value={form.delivery_fee} onChange={e => setForm(f => ({ ...f, delivery_fee: +e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>מינימום הזמנה (₪)</Label>
            <Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: +e.target.value }))} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="שעות פתיחה" icon={Clock}>
        <div className="space-y-3">
          {DAYS.map(day => {
            const h = form.opening_hours[day] ?? { open: '11:00', close: '23:00', closed: false };
            return (
              <div key={day} className="flex items-center gap-3">
                <div className="w-16 text-sm text-foreground">{DAY_LABELS[day]}</div>
                <Switch
                  checked={!h.closed}
                  onCheckedChange={v => setForm(f => ({
                    ...f,
                    opening_hours: { ...f.opening_hours, [day]: { ...f.opening_hours[day], closed: !v } },
                  }))}
                />
                {h.closed ? (
                  <span className="text-xs text-muted-foreground">סגור</span>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Input type="time" value={h.open}
                      onChange={e => setForm(f => ({
                        ...f,
                        opening_hours: { ...f.opening_hours, [day]: { ...f.opening_hours[day], open: e.target.value } },
                      }))}
                      className="w-28 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">עד</span>
                    <Input type="time" value={h.close}
                      onChange={e => setForm(f => ({
                        ...f,
                        opening_hours: { ...f.opening_hours, [day]: { ...f.opening_hours[day], close: e.target.value } },
                      }))}
                      className="w-28 h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="ניהול מלאי"
        description="הגדרות אלו שולטות על מעקב המלאי ועל תצוגת פריטים חסרים. כבויות כברירת מחדל."
        icon={Package}
      >
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm">מעקב מלאי אוטומטי</span>
              <p className="text-xs text-muted-foreground">
                בכל הזמנה יופחת המלאי אוטומטית לפי המתכון
              </p>
            </div>
            <Switch
              checked={form.inventory_tracking_enabled}
              onCheckedChange={v => setForm(f => ({ ...f, inventory_tracking_enabled: v }))}
            />
          </label>
          <label className="flex items-center justify-between">
            <div>
              <span className="text-sm">הצג פריטים חסרים בתפריט</span>
              <p className="text-xs text-muted-foreground">
                פריטים שנגמרו במלאי יסומנו כ"אזל" בתפריט הלקוח
              </p>
            </div>
            <Switch
              checked={form.out_of_stock_ui_enabled}
              onCheckedChange={v => setForm(f => ({ ...f, out_of_stock_ui_enabled: v }))}
            />
          </label>
        </div>
      </SectionCard>

      <div className="flex justify-end pb-6">
        <SaveButton onClick={handleSave} saving={saving} />
      </div>
    </div>
  );
};

export default AdminSettings;