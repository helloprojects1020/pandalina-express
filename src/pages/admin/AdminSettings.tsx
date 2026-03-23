import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

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
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS: Record<string, string> = {
  sunday: 'ראשון', monday: 'שני', tuesday: 'שלישי',
  wednesday: 'רביעי', thursday: 'חמישי', friday: 'שישי', saturday: 'שבת',
};

const defaultHours = () => Object.fromEntries(
  DAYS.map(d => [d, { open: '11:00', close: '23:00', closed: d === 'saturday' }])
);

const AdminSettings = () => {
  const { restaurantId } = useAuth();
  const [form, setForm] = useState<SettingsForm>({
    whatsapp_number: '', delivery_enabled: true, pickup_enabled: true,
    dine_in_enabled: true, delivery_fee: 0, min_order_amount: 0,
    opening_hours: defaultHours(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');

  useEffect(() => {
    if (!restaurantId) return;
    const fetch = async () => {
      setLoading(true);
      const [settingsRes, restRes] = await Promise.all([
        db.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).maybeSingle(),
        db.from('restaurants').select('name, phone, whatsapp').eq('id', restaurantId).maybeSingle(),
      ]);
      if (settingsRes.data) {
        const s = settingsRes.data;
        setForm({
          whatsapp_number: s.whatsapp ?? s.whatsapp_number ?? '',
          delivery_enabled: s.delivery_enabled ?? s.is_delivery ?? true,
          pickup_enabled: s.pickup_enabled ?? s.is_pickup ?? true,
          dine_in_enabled: s.dine_in_enabled ?? s.is_dinein ?? true,
          delivery_fee: s.delivery_fee ?? 0,
          min_order_amount: s.min_order_amount ?? s.minimum_order ?? 0,
          opening_hours: (s.opening_hours as SettingsForm['opening_hours']) ?? defaultHours(),
        });
      }
      if (restRes.data) {
        setRestaurantName(restRes.data.name);
        setRestaurantPhone(restRes.data.phone ?? '');
      }
      setLoading(false);
    };
    fetch();
  }, [restaurantId]);

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    const { error: settingsErr } = await db.from('restaurant_settings').upsert({
      restaurant_id: restaurantId,
      whatsapp: form.whatsapp_number,
      whatsapp_number: form.whatsapp_number,
      delivery_enabled: form.delivery_enabled,
      pickup_enabled: form.pickup_enabled,
      dine_in_enabled: form.dine_in_enabled,
      delivery_fee: form.delivery_fee,
      min_order_amount: form.min_order_amount,
      opening_hours: form.opening_hours,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'restaurant_id' });

    const { error: restErr } = await db.from('restaurants').update({
      name: restaurantName,
      phone: restaurantPhone,
      whatsapp: form.whatsapp_number,
    }).eq('id', restaurantId);

    if (settingsErr || restErr) {
      toast({ title: 'שגיאה בשמירה', description: (settingsErr ?? restErr)?.message, variant: 'destructive' });
    } else {
      toast({ title: 'ההגדרות נשמרו ✅' });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">הגדרות</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
          שמור
        </Button>
      </div>

      <section className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-foreground">פרטי המסעדה</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1"><Label>שם המסעדה</Label><Input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} /></div>
          <div className="space-y-1"><Label>טלפון</Label><Input value={restaurantPhone} onChange={e => setRestaurantPhone(e.target.value)} /></div>
          <div className="space-y-1"><Label>מספר WhatsApp</Label><Input value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="972526204159" /></div>
        </div>
      </section>

      <section className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-foreground">סוגי הזמנה</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between"><span className="text-sm">משלוח</span><Switch checked={form.delivery_enabled} onCheckedChange={v => setForm(f => ({ ...f, delivery_enabled: v }))} /></label>
          <label className="flex items-center justify-between"><span className="text-sm">איסוף עצמי</span><Switch checked={form.pickup_enabled} onCheckedChange={v => setForm(f => ({ ...f, pickup_enabled: v }))} /></label>
          <label className="flex items-center justify-between"><span className="text-sm">ישיבה במקום</span><Switch checked={form.dine_in_enabled} onCheckedChange={v => setForm(f => ({ ...f, dine_in_enabled: v }))} /></label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1"><Label>דמי משלוח (₪)</Label><Input type="number" value={form.delivery_fee} onChange={e => setForm(f => ({ ...f, delivery_fee: +e.target.value }))} /></div>
          <div className="space-y-1"><Label>מינימום הזמנה (₪)</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: +e.target.value }))} /></div>
        </div>
      </section>

      <section className="bg-card rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-foreground">שעות פתיחה</h2>
        <div className="space-y-3">
          {DAYS.map(day => {
            const h = form.opening_hours[day] ?? { open: '11:00', close: '23:00', closed: false };
            return (
              <div key={day} className="flex items-center gap-3">
                <div className="w-16 text-sm text-foreground">{DAY_LABELS[day]}</div>
                <Switch checked={!h.closed} onCheckedChange={v => setForm(f => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...f.opening_hours[day], closed: !v } } }))} />
                {h.closed ? <span className="text-xs text-muted-foreground">סגור</span> : (
                  <div className="flex gap-2 items-center">
                    <Input type="time" value={h.open} onChange={e => setForm(f => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...f.opening_hours[day], open: e.target.value } } }))} className="w-28 h-8 text-sm" />
                    <span className="text-xs text-muted-foreground">עד</span>
                    <Input type="time" value={h.close} onChange={e => setForm(f => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...f.opening_hours[day], close: e.target.value } } }))} className="w-28 h-8 text-sm" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminSettings;