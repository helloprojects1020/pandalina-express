import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Bell, Plus, Pencil, Trash2, Loader2, Send, Clock,
  Settings, History, Zap, AlertTriangle, CheckCircle,
  TrendingUp, Package, Users, MessageSquare, X, RefreshCw
} from 'lucide-react';
import { PageHeader, SectionCard, EmptyState, LoadingState } from '@/components/admin/AdminUI';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────
type Reminder = {
  id: string; title: string; message: string;
  reminder_type: string; target_type: string;
  target_phone: string | null; staff_id: string | null;
  scheduled_time: string; days_of_week: number[];
  is_active: boolean;
};

type StaffMember = { id: string; full_name: string; phone: string | null; role: string; };

type NotificationLog = {
  id: string; recipient_name: string | null; recipient_phone: string | null;
  message: string; channel: string; status: string; sent_at: string; notes: string | null;
};

type OwnerSettings = {
  owner_phone: string;
  send_halfday_report: boolean; halfday_report_time: string;
  send_eod_report: boolean; eod_report_time: string;
  send_low_stock_alerts: boolean;
  send_no_orders_alert: boolean; no_orders_threshold_minutes: number;
};

type SmartAlert = {
  id: string; type: 'warning' | 'info' | 'danger';
  title: string; message: string; action?: string;
};

const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const SYSTEM_ROLES: Record<string, string> = {
  owner: 'בעלים', manager: 'מנהל', shift_manager: 'מנהל משמרת',
  cashier: 'קופאי', waiter: 'מלצר', chef: 'טבח',
  kitchen: 'עובד מטבח', delivery: 'שליח', warehouse: 'אחראי מחסן',
};

const QUICK_TEMPLATES = [
  { title: 'ספירת מלאי בוקר', message: '📦 תזכורת:\nזה הזמן לבצע ספירת מלאי בוקר\nאנא עדכן את המערכת לאחר סיום', time: '08:00', role: 'warehouse' },
  { title: 'ספירת מלאי ערב', message: '📦 תזכורת:\nזה הזמן לבצע ספירת מלאי סוף יום\nאנא עדכן את המערכת לאחר סיום', time: '17:00', role: 'warehouse' },
  { title: 'דוח X', message: '📋 תזכורת:\nזה הזמן לבצע דוח X (חצי יום)\nאנא הזן את הנתונים במערכת', time: '13:00', role: 'shift_manager' },
  { title: 'דוח Z', message: '📋 תזכורת:\nזה הזמן לבצע דוח Z (סוף יום)\nאנא סגור את הקופה ועדכן', time: '22:00', role: 'shift_manager' },
  { title: 'פתיחת משמרת', message: '👋 בוקר טוב!\nזה הזמן לפתוח את המשמרת\nבדוק עובדים ופתח מערכת', time: '09:00', role: 'manager' },
  { title: 'סגירת יום', message: '🔒 תזכורת:\nזה הזמן לסגור את היום\nבצע דוח Z ועדכן מלאי', time: '23:00', role: 'manager' },
];

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function buildHalfDayReport(revenue: number, orders: number, staffCost: number, expenses: number): string {
  const status = revenue > (staffCost + expenses) ? '✅ תקין' : '⚠️ שים לב';
  return `📊 *סיכום חצי יומי*\n\n💰 הכנסות: ₪${Math.round(revenue).toLocaleString('he-IL')}\n📦 הזמנות: ${orders}\n👷 עלות עובדים: ₪${Math.round(staffCost).toLocaleString('he-IL')}\n💸 הוצאות: ₪${Math.round(expenses).toLocaleString('he-IL')}\n\n📢 מצב: ${status}`;
}

function buildEODReport(revenue: number, orders: number, staffCost: number, fixedCost: number, variableCost: number, marketingCost: number, topItem: string): string {
  const totalCost = staffCost + fixedCost + variableCost + marketingCost;
  const profit = revenue - totalCost;
  const status = profit > 0 ? `✅ רווח: ₪${Math.round(profit).toLocaleString('he-IL')}` : `❌ הפסד: ₪${Math.round(Math.abs(profit)).toLocaleString('he-IL')}`;
  return `📊 *סיכום יומי*\n\n💰 הכנסות: ₪${Math.round(revenue).toLocaleString('he-IL')}\n📦 הזמנות: ${orders}\n\n📉 *הוצאות:*\n👷 עובדים: ₪${Math.round(staffCost).toLocaleString('he-IL')}\n🏢 קבועות: ₪${Math.round(fixedCost).toLocaleString('he-IL')}\n🛒 משתנות: ₪${Math.round(variableCost).toLocaleString('he-IL')}\n📣 פרסום: ₪${Math.round(marketingCost).toLocaleString('he-IL')}\n\n⭐ מנה מובילה: ${topItem}\n\n${status}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminReminders = () => {
  const { restaurantId } = useAuth();
  const [tab, setTab] = useState<'reminders' | 'send' | 'owner' | 'alerts' | 'history'>('reminders');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [ownerSettings, setOwnerSettings] = useState<OwnerSettings>({
    owner_phone: '', send_halfday_report: true, halfday_report_time: '13:00',
    send_eod_report: true, eod_report_time: '22:00',
    send_low_stock_alerts: true, send_no_orders_alert: true, no_orders_threshold_minutes: 60,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Manual send
  const [manualPhone, setManualPhone] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [sendingManual, setSendingManual] = useState(false);

  // Form
  const [form, setForm] = useState({
    title: '', message: '', target_type: 'staff',
    target_phone: '', staff_id: '', role_target: '',
    scheduled_time: '09:00', days_of_week: [1,2,3,4,5,6,7] as number[],
    is_active: true,
  });

  // Scheduler ref
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentTodayRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!restaurantId) return;
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  // ─── Scheduler ────────────────────────────────────────────────────────────────
  useEffect(() => {
    schedulerRef.current = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDay = now.getDay() + 1; // 1=Sunday

      reminders.forEach(reminder => {
        if (!reminder.is_active) return;
        if (!reminder.days_of_week.includes(currentDay)) return;
        if (reminder.scheduled_time !== currentTime) return;

        const key = `${reminder.id}-${now.toISOString().slice(0, 10)}-${currentTime}`;
        if (sentTodayRef.current.has(key)) return;
        sentTodayRef.current.add(key);

        // הצג התראה בדפדפן
        toast({
          title: `🔔 תזכורת: ${reminder.title}`,
          description: reminder.message.slice(0, 100),
        });

        // שלח WhatsApp אם יש טלפון
        const phone = reminder.target_phone;
        if (phone) {
          sendWhatsApp(phone, reminder.message, reminder.id, '');
        }
      });
    }, 60000); // בדוק כל דקה

    return () => { if (schedulerRef.current) clearInterval(schedulerRef.current); };
  }, [reminders]);

  const loadAll = async () => {
    setLoading(true);
    const [remRes, staffRes, logsRes, settingsRes] = await Promise.all([
      db.from('reminders').select('*').eq('restaurant_id', restaurantId).order('scheduled_time'),
      db.from('staff').select('id, full_name, phone, role').eq('restaurant_id', restaurantId).eq('is_active', true),
      db.from('notification_log').select('*').eq('restaurant_id', restaurantId).order('sent_at', { ascending: false }).limit(50),
      db.from('owner_notification_settings').select('*').eq('restaurant_id', restaurantId).maybeSingle(),
    ]);
    setReminders(remRes.data ?? []);
    setStaff(staffRes.data ?? []);
    setLogs(logsRes.data ?? []);
    if (settingsRes.data) {
      setOwnerSettings(s => ({ ...s, ...settingsRes.data }));
    }
    await loadSmartAlerts();
    setLoading(false);
  };

  const loadSmartAlerts = async () => {
    const alerts: SmartAlert[] = [];
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    // בדוק הזמנות
    const { data: orders } = await db.from('orders').select('created_at, status').eq('restaurant_id', restaurantId).gte('created_at', todayStart.toISOString());
    const recentOrders = (orders ?? []).filter((o: { created_at: string }) => {
      const diff = (now.getTime() - new Date(o.created_at).getTime()) / 60000;
      return diff <= 60;
    });
    if (recentOrders.length === 0 && now.getHours() >= 11) {
      alerts.push({ id: 'no-orders', type: 'warning', title: 'אין הזמנות בשעה האחרונה', message: 'לא התקבלו הזמנות בשעה האחרונה. בדוק את מצב המערכת.' });
    }

    // בדוק מלאי נמוך
    const { data: inventory } = await db.from('inventory_items').select('name, current_stock, min_stock').eq('restaurant_id', restaurantId);
    const lowStock = (inventory ?? []).filter((i: { current_stock: number; min_stock: number }) => i.min_stock > 0 && i.current_stock <= i.min_stock);
    if (lowStock.length > 0) {
      alerts.push({ id: 'low-stock', type: 'danger', title: `${lowStock.length} מוצרים במלאי נמוך`, message: lowStock.slice(0, 3).map((i: { name: string }) => i.name).join(', ') + (lowStock.length > 3 ? ' ועוד...' : '') });
    }

    // בדוק הזמנות ממתינות
    const pending = (orders ?? []).filter((o: { status: string }) => o.status === 'new');
    if (pending.length > 3) {
      alerts.push({ id: 'pending-orders', type: 'warning', title: `${pending.length} הזמנות ממתינות לטיפול`, message: 'יש הזמנות שמחכות לאישור' });
    }

    setSmartAlerts(alerts);
  };

  // ─── WhatsApp ─────────────────────────────────────────────────────────────────
  const sendWhatsApp = useCallback(async (phone: string, message: string, reminderId?: string, recipientName?: string) => {
    const clean = phone.replace(/\D/g, '');
    const intl = clean.startsWith('0') ? `972${clean.slice(1)}` : clean;
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    // שמור לוג
    await db.from('notification_log').insert({
      restaurant_id: restaurantId,
      reminder_id: reminderId ?? null,
      recipient_name: recipientName ?? null,
      recipient_phone: phone,
      message,
      channel: 'whatsapp',
      status: 'sent',
    });
    // Refresh logs
    const { data } = await db.from('notification_log').select('*').eq('restaurant_id', restaurantId).order('sent_at', { ascending: false }).limit(50);
    setLogs(data ?? []);
  }, [restaurantId]);

  const sendManual = async () => {
    if (!manualPhone || !manualMessage) { toast({ title: 'טלפון והודעה חובה', variant: 'destructive' }); return; }
    setSendingManual(true);
    await sendWhatsApp(manualPhone, manualMessage, undefined, 'שליחה ידנית');
    toast({ title: 'הודעה נשלחה ✅' });
    setManualMessage('');
    setSendingManual(false);
  };

  // ─── Owner reports ────────────────────────────────────────────────────────────
  const sendOwnerReport = async (type: 'halfday' | 'eod') => {
    if (!ownerSettings.owner_phone) { toast({ title: 'הגדר מספר טלפון של בעל העסק קודם', variant: 'destructive' }); return; }

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

    const [ordersRes, staffRes, expensesRes, campaignsRes, itemsRes] = await Promise.all([
      db.from('orders').select('total, status').eq('restaurant_id', restaurantId).gte('created_at', todayStart.toISOString()).neq('status', 'cancelled'),
      db.from('shifts').select('start_time, end_time, hours_worked, staff_id').eq('restaurant_id', restaurantId).eq('date', now.toISOString().split('T')[0]),
      db.from('daily_expenses').select('amount').eq('restaurant_id', restaurantId).eq('date', now.toISOString().split('T')[0]),
      db.from('marketing_campaigns').select('amount').eq('restaurant_id', restaurantId).eq('date', now.toISOString().split('T')[0]),
      db.from('order_items').select('menu_item_name').eq('restaurant_id', restaurantId).gte('created_at', todayStart.toISOString()),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revenue = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
    const orderCount = (ordersRes.data ?? []).length;
    const variableCost = (expensesRes.data ?? []).reduce((s: number, e: { amount: number }) => s + e.amount, 0);
    const marketingCost = (campaignsRes.data ?? []).reduce((s: number, c: { amount: number }) => s + c.amount, 0);

    // חישוב עלות עובדים
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staffCost = (staffRes.data ?? []).reduce((s: number, shift: any) => {
      const hours = shift.hours_worked ?? Math.max(0, (parseInt(shift.end_time) - parseInt(shift.start_time)));
      return s + hours * 40; // ממוצע ₪40/שעה
    }, 0);

    // מנה מובילה
    const itemCount: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (itemsRes.data ?? []).forEach((i: any) => { const n = i.menu_item_name; itemCount[n] = (itemCount[n] ?? 0) + 1; });
    const topItem = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

    let message = '';
    if (type === 'halfday') {
      message = buildHalfDayReport(revenue, orderCount, staffCost, variableCost + marketingCost);
    } else {
      // Fixed cost estimate
      const { data: fixedData } = await db.from('fixed_expenses').select('monthly_amount').eq('restaurant_id', restaurantId).eq('is_active', true);
      const fixedCost = (fixedData ?? []).reduce((s: number, e: { monthly_amount: number }) => s + e.monthly_amount / 30, 0);
      message = buildEODReport(revenue, orderCount, staffCost, fixedCost, variableCost, marketingCost, topItem);
    }

    await sendWhatsApp(ownerSettings.owner_phone, message, undefined, 'בעל עסק');
    toast({ title: `דוח ${type === 'halfday' ? 'חצי יומי' : 'סוף יום'} נשלח ✅` });
  };

  const saveOwnerSettings = async () => {
    setSaving(true);
    const { data: existing } = await db.from('owner_notification_settings').select('id').eq('restaurant_id', restaurantId).maybeSingle();
    if (existing) {
      await db.from('owner_notification_settings').update({ ...ownerSettings, updated_at: new Date().toISOString() }).eq('restaurant_id', restaurantId);
    } else {
      await db.from('owner_notification_settings').insert({ ...ownerSettings, restaurant_id: restaurantId });
    }
    toast({ title: 'הגדרות נשמרו ✅' });
    setSaving(false);
  };

  // ─── Reminder CRUD ────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingReminder(null);
    setForm({ title: '', message: '', target_type: 'staff', target_phone: '', staff_id: '', role_target: '', scheduled_time: '09:00', days_of_week: [1,2,3,4,5,6,7], is_active: true });
    setSheet(true);
  };

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setForm(f => ({ ...f, title: t.title, message: t.message, scheduled_time: t.time }));
  };

  const save = async () => {
    if (!restaurantId || !form.title) { toast({ title: 'כותרת חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      title: form.title, message: form.message, reminder_type: 'whatsapp',
      target_type: form.target_type,
      target_phone: form.target_phone || (form.target_type === 'staff' ? staff.find(s => s.id === form.staff_id)?.phone : null) || null,
      staff_id: form.staff_id || null,
      scheduled_time: form.scheduled_time,
      days_of_week: form.days_of_week,
      is_active: form.is_active,
      restaurant_id: restaurantId,
    };
    if (editingReminder) {
      const { data, error } = await db.from('reminders').update(payload).eq('id', editingReminder.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setReminders(prev => prev.map(r => r.id === editingReminder.id ? data : r));
    } else {
      const { data, error } = await db.from('reminders').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setReminders(prev => [...prev, data]);
    }
    toast({ title: 'תזכורת נשמרה ✅' }); setSaving(false); setSheet(false);
  };

  const remove = async (id: string) => {
    await db.from('reminders').delete().eq('id', id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await db.from('reminders').update({ is_active }).eq('id', id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_active } : r));
  };

  if (loading) return <LoadingState />;

  const activeCount = reminders.filter(r => r.is_active).length;

  return (
    <div className="space-y-5" dir="rtl">

      <PageHeader
        title="תזכורות"
        description={`${activeCount} תזכורות פעילות · Scheduler רץ`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Scheduler פעיל
            </div>
            <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 ml-1" />תזכורת חדשה</Button>
          </div>
        }
      />

      {/* Smart alerts bar */}
      {smartAlerts.length > 0 && (
        <div className="space-y-2">
          {smartAlerts.map(alert => (
            <div key={alert.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
              alert.type === 'danger' ? 'bg-red-500/10 border-red-200 text-red-700' :
              alert.type === 'warning' ? 'bg-amber-500/10 border-amber-200 text-amber-700' :
              'bg-blue-500/10 border-blue-200 text-blue-700'
            }`}>
              {alert.type === 'danger' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Zap className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="font-semibold">{alert.title}</p>
                <p className="text-xs opacity-80 mt-0.5">{alert.message}</p>
              </div>
              {ownerSettings.owner_phone && (
                <button onClick={() => sendWhatsApp(ownerSettings.owner_phone, `⚠️ התראה: ${alert.title}\n${alert.message}`)}
                  className="text-xs font-semibold underline shrink-0">שלח לבעלים</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{reminders.length}</p>
          <p className="text-xs text-muted-foreground mt-1">תזכורות</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">פעילות</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">הודעות שנשלחו</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { key: 'reminders', label: 'תזכורות', icon: Bell },
          { key: 'send', label: 'שלח עכשיו', icon: Send },
          { key: 'owner', label: 'דוחות לבעלים', icon: TrendingUp },
          { key: 'alerts', label: `התראות (${smartAlerts.length})`, icon: Zap },
          { key: 'history', label: 'היסטוריה', icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0 ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ─── Reminders Tab ─── */}
      {tab === 'reminders' && (
        <div className="space-y-4">
          {/* Quick templates */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">תבניות מהירות:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {QUICK_TEMPLATES.map(t => (
                <button key={t.title} onClick={() => { applyTemplate(t); setSheet(true); }}
                  className="text-right px-3 py-2 rounded-xl bg-card border border-border hover:border-primary hover:text-primary transition-all text-xs">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{t.time} · {SYSTEM_ROLES[t.role]}</p>
                </button>
              ))}
            </div>
          </div>

          {reminders.length === 0 ? (
            <EmptyState icon={Bell} title="אין תזכורות" description="הגדר תזכורת אוטומטית ראשונה" />
          ) : (
            <div className="space-y-2">
              {reminders.map(r => {
                const staffName = staff.find(s => s.id === r.staff_id)?.full_name;
                return (
                  <div key={r.id} className={`bg-card rounded-xl p-4 shadow-sm border border-border/50 transition-all ${!r.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Bell className={`w-5 h-5 ${r.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">{r.title}</p>
                          <Badge variant="outline" className="text-xs">{r.scheduled_time}</Badge>
                          {staffName && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 border-blue-200">{staffName}</Badge>}
                          {r.target_phone && <span className="text-xs text-muted-foreground">{r.target_phone}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.days_of_week.map(d => DAYS_HE[d-1]).join(' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={r.is_active} onCheckedChange={v => toggleActive(r.id, v)} />
                        {r.target_phone && (
                          <button onClick={() => sendWhatsApp(r.target_phone!, r.message, r.id, staffName)}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-colors" title="שלח עכשיו">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => {
                          setEditingReminder(r);
                          setForm({ title: r.title, message: r.message, target_type: r.target_type, target_phone: r.target_phone ?? '', staff_id: r.staff_id ?? '', role_target: '', scheduled_time: r.scheduled_time, days_of_week: r.days_of_week, is_active: r.is_active });
                          setSheet(true);
                        }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Send Tab ─── */}
      {tab === 'send' && (
        <div className="space-y-4">
          <SectionCard title="שלח הודעה ידנית" icon={MessageSquare}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>מספר טלפון</Label>
              <div className="flex gap-2">
                <Input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="050-0000000" className="flex-1" />
                <Select value="custom" onValueChange={v => { if (v !== 'custom') { const s = staff.find(st => st.id === v); if (s?.phone) setManualPhone(s.phone); } }}>
                  <SelectTrigger className="w-40 shrink-0"><SelectValue placeholder="בחר עובד..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">הזן ידנית</SelectItem>
                    {staff.filter(s => s.phone).map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>הודעה</Label>
              <Textarea value={manualMessage} onChange={e => setManualMessage(e.target.value)} rows={4} placeholder="כתוב הודעה..." />
            </div>
            <div className="flex flex-wrap gap-2">
              {['שים לב לתפריט היום', 'בדוק הזמנות ממתינות', 'עדכן מלאי בדחיפות', 'בצע ספירת מלאי'].map(t => (
                <button key={t} onClick={() => setManualMessage(t)}
                  className="px-2.5 py-1 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t}
                </button>
              ))}
            </div>
            <Button onClick={sendManual} disabled={sendingManual} className="w-full">
              {sendingManual ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
              שלח WhatsApp
            </Button>
          </div>
          </SectionCard>

          {/* Staff quick send */}
          <SectionCard title="שלח לעובד מהיר" icon={Users}>
            <div className="space-y-2">
              {staff.filter(s => s.phone).map(s => (
                <div key={s.id} className="flex items-center justify-between bg-muted/20 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{SYSTEM_ROLES[s.role] ?? s.role} · {s.phone}</p>
                  </div>
                  <button onClick={() => { setManualPhone(s.phone!); setTab('send'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 text-xs font-medium hover:bg-green-500/20 transition-colors">
                    <Send className="w-3.5 h-3.5" />שלח
                  </button>
                </div>
              ))}
              {staff.filter(s => s.phone).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">אין עובדים עם מספר טלפון</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── Owner Reports Tab ─── */}
      {tab === 'owner' && (
        <div className="space-y-4">
          {/* Settings */}
          <SectionCard title="הגדרות דוחות לבעל העסק" icon={Settings}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>מספר טלפון של בעל העסק</Label>
              <Input value={ownerSettings.owner_phone} onChange={e => setOwnerSettings(s => ({ ...s, owner_phone: e.target.value }))} placeholder="050-0000000" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Switch checked={ownerSettings.send_halfday_report} onCheckedChange={v => setOwnerSettings(s => ({ ...s, send_halfday_report: v }))} />
                  <Label>דוח חצי יומי</Label>
                </div>
                <Input type="time" value={ownerSettings.halfday_report_time} onChange={e => setOwnerSettings(s => ({ ...s, halfday_report_time: e.target.value }))} className="w-28 h-8 text-xs" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Switch checked={ownerSettings.send_eod_report} onCheckedChange={v => setOwnerSettings(s => ({ ...s, send_eod_report: v }))} />
                  <Label>דוח סוף יום</Label>
                </div>
                <Input type="time" value={ownerSettings.eod_report_time} onChange={e => setOwnerSettings(s => ({ ...s, eod_report_time: e.target.value }))} className="w-28 h-8 text-xs" />
              </div>
              <div className="flex items-center gap-2 py-2 border-b border-border/50">
                <Switch checked={ownerSettings.send_low_stock_alerts} onCheckedChange={v => setOwnerSettings(s => ({ ...s, send_low_stock_alerts: v }))} />
                <Label>התראת מלאי נמוך</Label>
              </div>
              <div className="flex items-center gap-2 py-2">
                <Switch checked={ownerSettings.send_no_orders_alert} onCheckedChange={v => setOwnerSettings(s => ({ ...s, send_no_orders_alert: v }))} />
                <Label>התראה אם אין הזמנות</Label>
              </div>
            </div>
            <Button onClick={saveOwnerSettings} disabled={saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}שמור הגדרות
            </Button>
          </div>
          </SectionCard>

          {/* Send report now */}
          <SectionCard title="שלח דוח עכשיו" icon={TrendingUp}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-500/10 border border-orange-200 rounded-xl p-4 text-center">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold text-sm text-foreground">דוח חצי יומי</p>
                <p className="text-xs text-muted-foreground mb-3">הכנסות + הזמנות + עובדים</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => sendOwnerReport('halfday')}>
                  <Send className="w-3.5 h-3.5 ml-1" />שלח עכשיו
                </Button>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-sm text-foreground">דוח סוף יום</p>
                <p className="text-xs text-muted-foreground mb-3">סיכום מלא + רווח</p>
                <Button size="sm" className="w-full" onClick={() => sendOwnerReport('eod')}>
                  <Send className="w-3.5 h-3.5 ml-1" />שלח עכשיו
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* Preview */}
          <SectionCard title="תצוגה מקדימה — פורמט הודעה">
            <div className="bg-muted/30 rounded-xl p-4 text-xs font-mono whitespace-pre-line text-muted-foreground">
              {buildHalfDayReport(3200, 18, 950, 400)}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── Alerts Tab ─── */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">התראות חכמות בזמן אמת</p>
            <Button size="sm" variant="outline" onClick={loadSmartAlerts}>
              <RefreshCw className="w-3.5 h-3.5 ml-1" />רענן
            </Button>
          </div>

          {smartAlerts.length === 0 ? (
            <EmptyState icon={CheckCircle} title="הכל תקין!" description="אין התראות כרגע" />
          ) : (
            <div className="space-y-3">
              {smartAlerts.map(alert => (
                <div key={alert.id} className={`rounded-2xl p-5 border ${
                  alert.type === 'danger' ? 'bg-red-500/10 border-red-200' :
                  alert.type === 'warning' ? 'bg-amber-500/10 border-amber-200' :
                  'bg-blue-500/10 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {alert.type === 'danger' ? <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" /> :
                      alert.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" /> :
                      <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${alert.type === 'danger' ? 'text-red-700' : alert.type === 'warning' ? 'text-amber-700' : 'text-blue-700'}`}>{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                    {ownerSettings.owner_phone && (
                      <Button size="sm" variant="outline" onClick={() => sendWhatsApp(ownerSettings.owner_phone, `⚠️ ${alert.title}\n${alert.message}`)}>
                        <Send className="w-3.5 h-3.5 ml-1" />שלח לבעלים
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alert types explanation */}
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-3">סוגי התראות אוטומטיות:</p>
            <div className="space-y-2">
              {[
                { icon: Package, label: 'מלאי נמוך', desc: 'מוצרים מתחת למינימום', color: 'text-red-600' },
                { icon: Clock, label: 'אין הזמנות', desc: 'שעה ללא הזמנות בשעות פעילות', color: 'text-amber-600' },
                { icon: AlertTriangle, label: 'הזמנות ממתינות', desc: 'יותר מ-3 הזמנות ללא טיפול', color: 'text-orange-600' },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="flex items-center gap-3 text-xs">
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <div>
                    <span className="font-semibold text-foreground">{label}</span>
                    <span className="text-muted-foreground mr-2">— {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── History Tab ─── */}
      {tab === 'history' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{logs.length} הודעות אחרונות</p>
            <Button size="sm" variant="outline" onClick={loadAll}><RefreshCw className="w-3.5 h-3.5 ml-1" />רענן</Button>
          </div>
          {logs.length === 0 ? (
            <EmptyState icon={History} title="אין היסטוריה עדיין" />
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="bg-card rounded-xl p-3 shadow-sm border border-border/50">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${log.status === 'sent' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {log.status === 'sent' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.recipient_name && <span className="text-xs font-semibold text-foreground">{log.recipient_name}</span>}
                        {log.recipient_phone && <span className="text-xs text-muted-foreground">{log.recipient_phone}</span>}
                        <Badge variant="outline" className={`text-[10px] px-1.5 ${log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : 'bg-red-500/10 text-red-700 border-red-200'}`}>
                          {log.status === 'sent' ? '✓ נשלח' : '✗ נכשל'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{log.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDateTime(log.sent_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Sheet ─── */}
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingReminder ? 'עריכת תזכורת' : 'תזכורת חדשה'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>כותרת *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ספירת מלאי, דוח X..." /></div>
            <div className="space-y-1">
              <Label>הודעה</Label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder="תוכן ההודעה..." />
              <p className="text-xs text-muted-foreground">💡 השתמש בעיצוב: *מודגש* לטקסט מודגש</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שולח ל</Label>
                <Select value={form.target_type} onValueChange={v => setForm(f => ({ ...f, target_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">בעל העסק</SelectItem>
                    <SelectItem value="staff">עובד ספציפי</SelectItem>
                    <SelectItem value="phone">טלפון מותאם</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>שעה</Label><Input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} /></div>
            </div>
            {form.target_type === 'staff' && (
              <div className="space-y-1">
                <Label>בחר עובד</Label>
                <Select value={form.staff_id || 'none'} onValueChange={v => {
                  const member = staff.find(s => s.id === v);
                  setForm(f => ({ ...f, staff_id: v === 'none' ? '' : v, target_phone: member?.phone ?? f.target_phone }));
                }}>
                  <SelectTrigger><SelectValue placeholder="בחר עובד..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">בחר עובד</SelectItem>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.phone ?? 'ללא טלפון'})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>מספר טלפון לשליחה</Label>
              <Input value={form.target_phone} onChange={e => setForm(f => ({ ...f, target_phone: e.target.value }))} placeholder="050-0000000" />
              <p className="text-xs text-muted-foreground">נדרש לשליחה אוטומטית</p>
            </div>
            <div className="space-y-2">
              <Label>ימים פעילים</Label>
              <div className="flex gap-1.5">
                {DAYS_HE.map((d, i) => {
                  const dayNum = i + 1;
                  const active = form.days_of_week.includes(dayNum);
                  return (
                    <button key={d} onClick={() => setForm(f => ({ ...f, days_of_week: active ? f.days_of_week.filter(n => n !== dayNum) : [...f.days_of_week, dayNum] }))}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>פעיל</Label></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheet(false)}>ביטול</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingReminder ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default AdminReminders;