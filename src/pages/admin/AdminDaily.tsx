import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag,
  Plus, Pencil, Trash2, Loader2, AlertTriangle, CheckCircle,
  Megaphone, Clock, Bell, Calendar, ChevronDown, ChevronUp,
  BarChart2, Minus, RefreshCw
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────
type FixedExpense = { id: string; name: string; category: string; monthly_amount: number; is_active: boolean; notes: string | null; };
type DailyExpense = { id: string; date: string; category: string; amount: number; description: string | null; notes: string | null; };
type MarketingCampaign = { id: string; date: string; platform: string; campaign_type: string | null; amount: number; orders_from_campaign: number; revenue_from_campaign: number; notes: string | null; };
type DailyReport = { id: string; date: string; report_type: string; cash_amount: number; card_amount: number; total_amount: number; notes: string | null; created_at?: string; };
type Reminder = { id: string; title: string; message: string; reminder_type: string; target_type: string; target_phone: string | null; staff_id: string | null; scheduled_time: string; days_of_week: number[]; is_active: boolean; };
type StaffMember = { id: string; full_name: string; role: string; salary_type: string; hourly_rate: number; daily_rate: number; };
type DailyStaff = { staff_id: string; name: string; role: string; start_time: string; end_time: string; salary_type: string; rate: number; };

const FIXED_CATEGORIES = ['שכירות', 'חשמל', 'מים', 'אינטרנט', 'ארנונה', 'ביטוח', 'תוכנות', 'אחר'];
const DAILY_CATEGORIES = ['קניות', 'תיקונים', 'שליחים', 'ציוד', 'ניקיון', 'אחר'];
const PLATFORMS = ['פייסבוק', 'אינסטגרם', 'גוגל', 'טיקטוק', 'וואטסאפ', 'אחר'];
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function calcHours(start: string, end: string): number {
  const startParts = start.split(':').map(Number);
  const endParts = end.split(':').map(Number);
  const sh = startParts[0], sm = startParts[1] ?? 0;
  const eh = endParts[0], em = endParts[1] ?? 0;
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function fmtCurrency(n: number) { return `₪${Math.round(n).toLocaleString('he-IL')}`; }

function ProfitBadge({ value }: { value: number }) {
  if (value > 0) return <span className="flex items-center gap-1 text-emerald-600 font-bold"><TrendingUp className="w-4 h-4" />{fmtCurrency(value)} רווח</span>;
  if (value < 0) return <span className="flex items-center gap-1 text-red-600 font-bold"><TrendingDown className="w-4 h-4" />{fmtCurrency(Math.abs(value))} הפסד</span>;
  return <span className="text-slate-500 font-medium">איזון</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDaily = () => {
  const { restaurantId } = useAuth();
  const [tab, setTab] = useState<'overview' | 'staff' | 'fixed' | 'variable' | 'marketing' | 'reports' | 'reminders'>('overview');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<MarketingCampaign[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [allReports, setAllReports] = useState<DailyReport[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);

  // Daily staff
  const [dailyStaff, setDailyStaff] = useState<DailyStaff[]>([]);
  const [addingStaff, setAddingStaff] = useState(false);

  // Sheets
  const [fixedSheet, setFixedSheet] = useState(false);
  const [variableSheet, setVariableSheet] = useState(false);
  const [marketingSheet, setMarketingSheet] = useState(false);
  const [reportSheet, setReportSheet] = useState(false);
  const [reminderSheet, setReminderSheet] = useState(false);
  const [editingFixed, setEditingFixed] = useState<FixedExpense | null>(null);
  const [editingExpense, setEditingExpense] = useState<DailyExpense | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Forms
  const [fixedForm, setFixedForm] = useState({ name: '', category: 'שכירות', monthly_amount: 0, notes: '' });
  const [variableForm, setVariableForm] = useState({ date: selectedDate, category: 'קניות', amount: 0, description: '', notes: '' });
  const [marketingForm, setMarketingForm] = useState({ date: selectedDate, platform: 'פייסבוק', campaign_type: '', amount: 0, orders_from_campaign: 0, revenue_from_campaign: 0, notes: '' });
  const [reportForm, setReportForm] = useState({ date: selectedDate, report_type: 'Z', cash_amount: 0, card_amount: 0, notes: '' });
  const [reminderForm, setReminderForm] = useState({ title: '', message: '', reminder_type: 'whatsapp', target_type: 'owner', target_phone: '', staff_id: '', scheduled_time: '09:00', days_of_week: [1,2,3,4,5,6,7] as number[], is_active: true });

  useEffect(() => {
    if (!restaurantId) return;
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, selectedDate]);

  const loadAll = async () => {
    setLoading(true);
    const last30 = new Date(); last30.setDate(last30.getDate() - 30);
    const last30str = last30.toISOString().split('T')[0];

    const [fixedRes, dailyRes, campRes, allCampRes, reportRes, allReportRes, reminderRes, staffRes, ordersRes] = await Promise.all([
      db.from('fixed_expenses').select('*').eq('restaurant_id', restaurantId).order('category'),
      db.from('daily_expenses').select('*').eq('restaurant_id', restaurantId).eq('date', selectedDate),
      db.from('marketing_campaigns').select('*').eq('restaurant_id', restaurantId).eq('date', selectedDate),
      db.from('marketing_campaigns').select('*').eq('restaurant_id', restaurantId).gte('date', last30str).order('date', { ascending: false }),
      db.from('daily_reports').select('*').eq('restaurant_id', restaurantId).eq('date', selectedDate),
      db.from('daily_reports').select('*').eq('restaurant_id', restaurantId).gte('date', last30str).order('date', { ascending: false }),
      db.from('reminders').select('*').eq('restaurant_id', restaurantId).order('scheduled_time'),
      db.from('staff').select('id, full_name, role, salary_type, hourly_rate, daily_rate').eq('restaurant_id', restaurantId).eq('is_active', true),
      db.from('orders').select('total').eq('restaurant_id', restaurantId).gte('created_at', `${selectedDate}T00:00:00`).lte('created_at', `${selectedDate}T23:59:59`).neq('status', 'cancelled'),
    ]);

    setFixedExpenses(fixedRes.data ?? []);
    setDailyExpenses(dailyRes.data ?? []);
    setCampaigns(campRes.data ?? []);
    setAllCampaigns(allCampRes.data ?? []);
    setDailyReports(reportRes.data ?? []);
    setAllReports(allReportRes.data ?? []);
    setReminders(reminderRes.data ?? []);
    setStaffList(staffRes.data ?? []);

    const orders = ordersRes.data ?? [];
    setTodayOrders(orders.length);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTodayRevenue(orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0));
    setLoading(false);
  };

  // ─── Calculations ─────────────────────────────────────────────────────────────

  const daysInMonth = new Date(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth() + 1, 0).getDate();

  const dailyFixedCost = useMemo(() =>
    fixedExpenses.filter(e => e.is_active).reduce((s, e) => s + e.monthly_amount / daysInMonth, 0),
    [fixedExpenses, daysInMonth]
  );

  const dailyVariableCost = useMemo(() =>
    dailyExpenses.reduce((s, e) => s + e.amount, 0),
    [dailyExpenses]
  );

  const dailyStaffCost = useMemo(() =>
    dailyStaff.reduce((s, ds) => {
      const hours = calcHours(ds.start_time, ds.end_time);
      return s + (ds.salary_type === 'hourly' ? hours * ds.rate : ds.rate);
    }, 0),
    [dailyStaff]
  );

  const dailyMarketingCost = useMemo(() =>
    campaigns.reduce((s, c) => s + c.amount, 0),
    [campaigns]
  );

  const totalCosts = dailyFixedCost + dailyVariableCost + dailyStaffCost + dailyMarketingCost;
  const dailyProfit = todayRevenue - totalCosts;

  // Marketing ROI
  const totalMarketingOrders = campaigns.reduce((s, c) => s + c.orders_from_campaign, 0);
  const totalMarketingRevenue = campaigns.reduce((s, c) => s + c.revenue_from_campaign, 0);
  const marketingROI = totalMarketingRevenue - dailyMarketingCost;
  const costPerOrder = totalMarketingOrders > 0 ? dailyMarketingCost / totalMarketingOrders : 0;

  // ─── Staff ────────────────────────────────────────────────────────────────────

  const addStaffToDay = (member: StaffMember) => {
    if (dailyStaff.find(ds => ds.staff_id === member.id)) return;
    setDailyStaff(prev => [...prev, {
      staff_id: member.id, name: member.full_name, role: member.role,
      start_time: '09:00', end_time: '17:00',
      salary_type: member.salary_type, rate: member.salary_type === 'hourly' ? member.hourly_rate : member.daily_rate,
    }]);
  };

  const updateDailyStaff = (staffId: string, field: keyof DailyStaff, value: string | number) => {
    setDailyStaff(prev => prev.map(ds => ds.staff_id === staffId ? { ...ds, [field]: value } : ds));
  };

  // ─── Fixed expenses ───────────────────────────────────────────────────────────

  const saveFixed = async () => {
    if (!restaurantId || !fixedForm.name) { toast({ title: 'שם חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...fixedForm, restaurant_id: restaurantId, updated_at: new Date().toISOString() };
    if (editingFixed) {
      const { data, error } = await db.from('fixed_expenses').update(payload).eq('id', editingFixed.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      setFixedExpenses(prev => prev.map(e => e.id === editingFixed.id ? data : e));
      toast({ title: 'הוצאה עודכנה ✅' });
    } else {
      const { data, error } = await db.from('fixed_expenses').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      setFixedExpenses(prev => [...prev, data]);
      toast({ title: 'הוצאה נוספה ✅' });
    }
    setSaving(false); setFixedSheet(false);
  };

  const deleteFixed = async (id: string) => {
    await db.from('fixed_expenses').delete().eq('id', id);
    setFixedExpenses(prev => prev.filter(e => e.id !== id));
    toast({ title: 'הוצאה נמחקה' });
  };

  // ─── Daily expenses ───────────────────────────────────────────────────────────

  const saveVariable = async () => {
    if (!restaurantId || !variableForm.amount) { toast({ title: 'סכום חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...variableForm, restaurant_id: restaurantId };
    if (editingExpense) {
      const { data, error } = await db.from('daily_expenses').update(payload).eq('id', editingExpense.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setDailyExpenses(prev => prev.map(e => e.id === editingExpense.id ? data : e));
    } else {
      const { data, error } = await db.from('daily_expenses').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setDailyExpenses(prev => [...prev, data]);
    }
    toast({ title: 'הוצאה נשמרה ✅' }); setSaving(false); setVariableSheet(false);
  };

  const deleteVariable = async (id: string) => {
    await db.from('daily_expenses').delete().eq('id', id);
    setDailyExpenses(prev => prev.filter(e => e.id !== id));
  };

  // ─── Marketing ────────────────────────────────────────────────────────────────

  const saveMarketing = async () => {
    if (!restaurantId || !marketingForm.amount) { toast({ title: 'סכום חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...marketingForm, restaurant_id: restaurantId };
    if (editingCampaign) {
      const { data, error } = await db.from('marketing_campaigns').update(payload).eq('id', editingCampaign.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? data : c));
    } else {
      const { data, error } = await db.from('marketing_campaigns').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setCampaigns(prev => [...prev, data]);
    }
    toast({ title: 'קמפיין נשמר ✅' }); setSaving(false); setMarketingSheet(false);
  };

  const deleteCampaign = async (id: string) => {
    await db.from('marketing_campaigns').delete().eq('id', id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  // ─── Daily report ─────────────────────────────────────────────────────────────

  const saveReport = async () => {
    if (!restaurantId) return;
    setSaving(true);
    const total = reportForm.cash_amount + reportForm.card_amount;
    const payload = { ...reportForm, total_amount: total, restaurant_id: restaurantId };
    const { data, error } = await db.from('daily_reports').insert(payload).select('*').single();
    if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
    setDailyReports(prev => [...prev, data]);
    toast({ title: `דוח ${reportForm.report_type} נשמר ✅` }); setSaving(false); setReportSheet(false);
  };

  // ─── Reminders ────────────────────────────────────────────────────────────────

  const saveReminder = async () => {
    if (!restaurantId || !reminderForm.title || !reminderForm.message) {
      toast({ title: 'כותרת והודעה חובה', variant: 'destructive' }); return;
    }
    setSaving(true);
    const payload = { ...reminderForm, restaurant_id: restaurantId, staff_id: reminderForm.staff_id || null, target_phone: reminderForm.target_phone || null };
    if (editingReminder) {
      const { data, error } = await db.from('reminders').update(payload).eq('id', editingReminder.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setReminders(prev => prev.map(r => r.id === editingReminder.id ? data : r));
    } else {
      const { data, error } = await db.from('reminders').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setReminders(prev => [...prev, data]);
    }
    toast({ title: 'תזכורת נשמרה ✅' }); setSaving(false); setReminderSheet(false);
  };

  const deleteReminder = async (id: string) => {
    await db.from('reminders').delete().eq('id', id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const sendWhatsApp = (phone: string, message: string) => {
    const clean = phone.replace(/\D/g, '');
    const intl = clean.startsWith('0') ? `972${clean.slice(1)}` : clean;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const tabs = [
    { key: 'overview', label: 'סיכום יומי', icon: BarChart2 },
    { key: 'staff', label: 'עובדים', icon: Users },
    { key: 'fixed', label: 'הוצאות קבועות', icon: DollarSign },
    { key: 'variable', label: 'הוצאות משתנות', icon: ShoppingBag },
    { key: 'marketing', label: 'פרסום', icon: Megaphone },
    { key: 'reports', label: 'דוחות X/Z', icon: Clock },
    { key: 'reminders', label: 'תזכורות', icon: Bell },
  ];

  return (
    <div className="space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">דוח יומי תפעולי</h1>
          <p className="text-sm text-muted-foreground mt-0.5">שליטה מלאה בזמן אמת</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40 h-9 text-sm" />
          <Button size="sm" variant="outline" onClick={loadAll}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0 ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* מצב רווח/הפסד */}
          <div className={`rounded-2xl p-5 text-white ${dailyProfit >= 0 ? 'bg-gradient-to-l from-emerald-600 to-emerald-500' : 'bg-gradient-to-l from-red-600 to-red-500'}`}
            style={{ boxShadow: dailyProfit >= 0 ? '0 8px 32px rgba(16,185,129,0.3)' : '0 8px 32px rgba(239,68,68,0.3)' }}>
            <p className="text-sm font-medium opacity-80">מצב יומי — {new Date(selectedDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-3xl font-black">{fmtCurrency(Math.abs(dailyProfit))}</p>
                <p className="text-sm opacity-80 mt-0.5">{dailyProfit >= 0 ? '✅ רווח משוער' : '❌ הפסד משוער'}</p>
              </div>
              <div className="text-left">
                <p className="text-xs opacity-70">הכנסות</p>
                <p className="text-xl font-bold">{fmtCurrency(todayRevenue)}</p>
              </div>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-white/60 rounded-full transition-all"
                style={{ width: `${totalCosts > 0 ? Math.min((todayRevenue / (todayRevenue + Math.abs(dailyProfit))) * 100, 100) : 0}%` }} />
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'הכנסות', value: fmtCurrency(todayRevenue), sub: `${todayOrders} הזמנות`, color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: TrendingUp },
              { label: 'עלות עובדים', value: fmtCurrency(dailyStaffCost), sub: `${dailyStaff.length} עובדים`, color: 'text-blue-600', bg: 'bg-blue-500/10', icon: Users },
              { label: 'הוצאות קבועות', value: fmtCurrency(dailyFixedCost), sub: 'חלק יומי', color: 'text-slate-600', bg: 'bg-slate-500/10', icon: DollarSign },
              { label: 'הוצאות משתנות', value: fmtCurrency(dailyVariableCost), sub: 'היום', color: 'text-orange-600', bg: 'bg-orange-500/10', icon: ShoppingBag },
            ].map(({ label, value, sub, color, bg, icon: Icon }) => (
              <div key={label} className="bg-card rounded-xl p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* פירוט עלויות */}
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <p className="font-semibold text-foreground text-sm mb-3">פירוט עלויות יומיות</p>
            <div className="space-y-2">
              {[
                { label: 'עובדים', amount: dailyStaffCost, color: 'bg-blue-500' },
                { label: 'הוצאות קבועות (חלק יומי)', amount: dailyFixedCost, color: 'bg-slate-400' },
                { label: 'הוצאות משתנות', amount: dailyVariableCost, color: 'bg-orange-500' },
                { label: 'פרסום', amount: dailyMarketingCost, color: 'bg-purple-500' },
              ].map(({ label, amount, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${totalCosts > 0 ? (amount / totalCosts) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-16 text-left">{fmtCurrency(amount)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-sm font-semibold text-foreground">סה"כ הוצאות</span>
                <span className="text-sm font-bold text-foreground">{fmtCurrency(totalCosts)}</span>
              </div>
            </div>
          </div>

          {/* פרסום ROI */}
          {campaigns.length > 0 && (
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <p className="font-semibold text-foreground text-sm mb-3">📣 ביצועי פרסום היום</p>
              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-lg font-bold text-foreground">{fmtCurrency(dailyMarketingCost)}</p>
                  <p className="text-xs text-muted-foreground">השקעה</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-lg font-bold text-foreground">{totalMarketingOrders}</p>
                  <p className="text-xs text-muted-foreground">הזמנות</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-lg font-bold text-foreground">{costPerOrder > 0 ? fmtCurrency(costPerOrder) : '—'}</p>
                  <p className="text-xs text-muted-foreground">עלות/הזמנה</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                marketingROI > 0 ? 'bg-emerald-500/10 text-emerald-700' :
                marketingROI > -dailyMarketingCost * 0.3 ? 'bg-yellow-500/10 text-yellow-700' :
                'bg-red-500/10 text-red-700'
              }`}>
                {marketingROI > 0 ? '🟢 פרסום משתלם' : marketingROI > -dailyMarketingCost * 0.3 ? '🟡 גבולי' : '🔴 הפסד בפרסום'}
                <span className="mr-auto">{fmtCurrency(totalMarketingRevenue)} הכנסות מפרסום</span>
              </div>
            </div>
          )}

          {/* דוחות X/Z */}
          {dailyReports.length > 0 && (
            <div className="bg-card rounded-2xl p-4 shadow-sm">
              <p className="font-semibold text-foreground text-sm mb-2">📋 דוחות היום</p>
              <div className="space-y-2">
                {dailyReports.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{r.report_type === 'X' ? 'דוח X (חצי יום)' : 'דוח Z (סוף יום)'}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at ?? '').toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="font-bold text-sm">{fmtCurrency(r.total_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* כפתורי פעולה מהירים */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => { setReportForm(f => ({ ...f, report_type: 'X', date: selectedDate })); setReportSheet(true); }}>
              <Clock className="w-4 h-4 ml-1" />הגש דוח X
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setReportForm(f => ({ ...f, report_type: 'Z', date: selectedDate })); setReportSheet(true); }}>
              <CheckCircle className="w-4 h-4 ml-1" />הגש דוח Z
            </Button>
          </div>
        </div>
      )}

      {/* ─── Staff tab ─── */}
      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">עובדים היום</p>
              <p className="text-xs text-muted-foreground">עלות כוח אדם: <span className="font-bold text-foreground">{fmtCurrency(dailyStaffCost)}</span></p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddingStaff(v => !v)}>
              <Plus className="w-4 h-4 ml-1" />הוסף עובד
            </Button>
          </div>

          {addingStaff && (
            <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">בחר עובד להוסיף:</p>
              <div className="flex flex-wrap gap-2">
                {staffList.filter(s => !dailyStaff.find(ds => ds.staff_id === s.id)).map(s => (
                  <button key={s.id} onClick={() => { addStaffToDay(s); setAddingStaff(false); }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-card border border-border hover:border-primary hover:text-primary transition-all">
                    {s.full_name}
                  </button>
                ))}
                {staffList.filter(s => !dailyStaff.find(ds => ds.staff_id === s.id)).length === 0 &&
                  <p className="text-xs text-muted-foreground">כל העובדים הפעילים נוספו</p>}
              </div>
            </div>
          )}

          {dailyStaff.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">לא נוספו עובדים להיום</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dailyStaff.map(ds => {
                const hours = calcHours(ds.start_time, ds.end_time);
                const cost = ds.salary_type === 'hourly' ? hours * ds.rate : ds.rate;
                return (
                  <div key={ds.staff_id} className="bg-card rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{ds.name}</p>
                        <p className="text-xs text-muted-foreground">{ds.role} · {ds.salary_type === 'hourly' ? `₪${ds.rate}/שעה` : `₪${ds.rate}/יום`}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-foreground">{fmtCurrency(cost)}</p>
                        <p className="text-xs text-muted-foreground">{hours.toFixed(1)} שעות</p>
                      </div>
                      <button onClick={() => setDailyStaff(prev => prev.filter(d => d.staff_id !== ds.staff_id))}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">שעת התחלה</Label>
                        <Input type="time" value={ds.start_time} className="h-8 text-xs"
                          onChange={e => updateDailyStaff(ds.staff_id, 'start_time', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">שעת סיום</Label>
                        <Input type="time" value={ds.end_time} className="h-8 text-xs"
                          onChange={e => updateDailyStaff(ds.staff_id, 'end_time', e.target.value)} />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">סה"כ עלות עובדים</span>
                <span className="text-lg font-bold text-primary">{fmtCurrency(dailyStaffCost)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Fixed expenses tab ─── */}
      {tab === 'fixed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">הוצאות קבועות חודשיות</p>
              <p className="text-xs text-muted-foreground">עלות יומית: <span className="font-bold text-foreground">{fmtCurrency(dailyFixedCost)}</span></p>
            </div>
            <Button size="sm" onClick={() => { setEditingFixed(null); setFixedForm({ name: '', category: 'שכירות', monthly_amount: 0, notes: '' }); setFixedSheet(true); }}>
              <Plus className="w-4 h-4 ml-1" />הוסף
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl p-4 shadow-sm text-center">
              <p className="text-xl font-bold text-foreground">{fmtCurrency(fixedExpenses.filter(e => e.is_active).reduce((s, e) => s + e.monthly_amount, 0))}</p>
              <p className="text-xs text-muted-foreground">חודשי סה"כ</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-sm text-center">
              <p className="text-xl font-bold text-foreground">{fmtCurrency(dailyFixedCost)}</p>
              <p className="text-xs text-muted-foreground">חלק יומי</p>
            </div>
            <div className="bg-card rounded-xl p-4 shadow-sm text-center">
              <p className="text-xl font-bold text-foreground">{fixedExpenses.filter(e => e.is_active).length}</p>
              <p className="text-xs text-muted-foreground">פעילות</p>
            </div>
          </div>

          {fixedExpenses.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין הוצאות קבועות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fixedExpenses.map(expense => (
                <div key={expense.id} className={`bg-card rounded-xl p-4 shadow-sm flex items-center gap-3 ${!expense.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{expense.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                      <span className="text-xs text-muted-foreground">יומי: {fmtCurrency(expense.monthly_amount / daysInMonth)}</span>
                    </div>
                  </div>
                  <p className="font-bold text-foreground">{fmtCurrency(expense.monthly_amount)}/חודש</p>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingFixed(expense); setFixedForm({ name: expense.name, category: expense.category, monthly_amount: expense.monthly_amount, notes: expense.notes ?? '' }); setFixedSheet(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>למחוק?</AlertDialogTitle><AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteFixed(expense.id)}>מחק</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Variable expenses tab ─── */}
      {tab === 'variable' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">הוצאות משתנות — {new Date(selectedDate).toLocaleDateString('he-IL')}</p>
              <p className="text-xs text-muted-foreground">סה"כ היום: <span className="font-bold text-foreground">{fmtCurrency(dailyVariableCost)}</span></p>
            </div>
            <Button size="sm" onClick={() => { setEditingExpense(null); setVariableForm({ date: selectedDate, category: 'קניות', amount: 0, description: '', notes: '' }); setVariableSheet(true); }}>
              <Plus className="w-4 h-4 ml-1" />הוסף
            </Button>
          </div>

          {dailyExpenses.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין הוצאות משתנות להיום</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dailyExpenses.map(expense => (
                <div key={expense.id} className="bg-card rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{expense.description ?? expense.category}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                      {expense.notes && <span className="text-xs text-muted-foreground italic">{expense.notes}</span>}
                    </div>
                  </div>
                  <p className="font-bold text-foreground">{fmtCurrency(expense.amount)}</p>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingExpense(expense); setVariableForm({ date: expense.date, category: expense.category, amount: expense.amount, description: expense.description ?? '', notes: expense.notes ?? '' }); setVariableSheet(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>למחוק?</AlertDialogTitle><AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteVariable(expense.id)}>מחק</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Marketing tab ─── */}
      {tab === 'marketing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">פרסום וקמפיינים</p>
              <p className="text-xs text-muted-foreground">השקעה היום: <span className="font-bold text-foreground">{fmtCurrency(dailyMarketingCost)}</span></p>
            </div>
            <Button size="sm" onClick={() => { setEditingCampaign(null); setMarketingForm({ date: selectedDate, platform: 'פייסבוק', campaign_type: '', amount: 0, orders_from_campaign: 0, revenue_from_campaign: 0, notes: '' }); setMarketingSheet(true); }}>
              <Plus className="w-4 h-4 ml-1" />הוסף קמפיין
            </Button>
          </div>

          {campaigns.length > 0 && (
            <div className={`rounded-xl p-4 border text-sm font-bold flex items-center gap-2 ${
              marketingROI > 0 ? 'bg-emerald-500/10 border-emerald-200 text-emerald-700' :
              marketingROI > -dailyMarketingCost * 0.3 ? 'bg-yellow-500/10 border-yellow-200 text-yellow-700' :
              'bg-red-500/10 border-red-200 text-red-700'
            }`}>
              {marketingROI > 0 ? '🟢 פרסום משתלם' : marketingROI > -dailyMarketingCost * 0.3 ? '🟡 גבולי' : '🔴 הפסד בפרסום'}
              <span className="text-xs font-normal mr-auto">
                השקעה: {fmtCurrency(dailyMarketingCost)} · הזמנות: {totalMarketingOrders} · הכנסות: {fmtCurrency(totalMarketingRevenue)}
                {costPerOrder > 0 && ` · עלות/הזמנה: ${fmtCurrency(costPerOrder)}`}
              </span>
            </div>
          )}

          {campaigns.length === 0 && allCampaigns.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <Megaphone className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין קמפיינים עדיין</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* סיכום כולל */}
              {allCampaigns.length > 0 && (
                <div className="bg-card rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">📊 סיכום 30 יום אחרונים</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-muted/30 rounded-xl p-3">
                      <p className="text-lg font-bold text-foreground">{fmtCurrency(allCampaigns.reduce((s, c) => s + c.amount, 0))}</p>
                      <p className="text-xs text-muted-foreground">השקעה</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3">
                      <p className="text-lg font-bold text-foreground">{allCampaigns.reduce((s, c) => s + c.orders_from_campaign, 0)}</p>
                      <p className="text-xs text-muted-foreground">הזמנות</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3">
                      <p className="text-lg font-bold text-foreground">{fmtCurrency(allCampaigns.reduce((s, c) => s + c.revenue_from_campaign, 0))}</p>
                      <p className="text-xs text-muted-foreground">הכנסות</p>
                    </div>
                    <div className={`rounded-xl p-3 ${allCampaigns.reduce((s, c) => s + c.revenue_from_campaign - c.amount, 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      <p className={`text-lg font-bold ${allCampaigns.reduce((s, c) => s + c.revenue_from_campaign - c.amount, 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fmtCurrency(allCampaigns.reduce((s, c) => s + c.revenue_from_campaign - c.amount, 0))}
                      </p>
                      <p className="text-xs text-muted-foreground">ROI כולל</p>
                    </div>
                  </div>
                </div>
              )}
              {/* קמפיינים */}
              {(campaigns.length > 0 ? campaigns : allCampaigns).map(c => {
                const roi = c.revenue_from_campaign - c.amount;
                return (
                  <div key={c.id} className="bg-card rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs bg-purple-500/10 text-purple-700 border-purple-200 border">{c.platform}</Badge>
                        {c.campaign_type && <span className="text-xs text-muted-foreground">{c.campaign_type}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString('he-IL')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCampaign(c); setMarketingForm({ date: c.date, platform: c.platform, campaign_type: c.campaign_type ?? '', amount: c.amount, orders_from_campaign: c.orders_from_campaign, revenue_from_campaign: c.revenue_from_campaign, notes: c.notes ?? '' }); setMarketingSheet(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>למחוק קמפיין?</AlertDialogTitle><AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteCampaign(c.id)}>מחק</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-muted/30 rounded-lg p-2"><p className="text-sm font-bold">{fmtCurrency(c.amount)}</p><p className="text-xs text-muted-foreground">השקעה</p></div>
                      <div className="bg-muted/30 rounded-lg p-2"><p className="text-sm font-bold">{c.orders_from_campaign}</p><p className="text-xs text-muted-foreground">הזמנות</p></div>
                      <div className="bg-muted/30 rounded-lg p-2"><p className="text-sm font-bold">{fmtCurrency(c.revenue_from_campaign)}</p><p className="text-xs text-muted-foreground">הכנסה</p></div>
                      <div className={`rounded-lg p-2 ${roi >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <p className={`text-sm font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{roi >= 0 ? '+' : ''}{fmtCurrency(roi)}</p>
                        <p className="text-xs text-muted-foreground">ROI</p>
                      </div>
                    </div>
                    {c.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{c.notes}"</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Reports tab ─── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">דוחות X/Z</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setReportForm({ date: selectedDate, report_type: 'X', cash_amount: 0, card_amount: 0, notes: '' }); setReportSheet(true); }}>
                <Clock className="w-4 h-4 ml-1" />דוח X
              </Button>
              <Button size="sm" onClick={() => { setReportForm({ date: selectedDate, report_type: 'Z', cash_amount: 0, card_amount: 0, notes: '' }); setReportSheet(true); }}>
                <CheckCircle className="w-4 h-4 ml-1" />דוח Z
              </Button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold mb-1">💡 הסבר:</p>
            <p><strong>דוח X</strong> — בקרה אמצע יום. מציג סיכום עד עכשיו מבלי לאפס את הקופה.</p>
            <p className="mt-1"><strong>דוח Z</strong> — סיכום סוף יום. מאפס את הקופה ושומר את הנתונים.</p>
          </div>

          {allReports.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין דוחות עדיין</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-card rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-3">📊 סיכום 30 יום אחרונים</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-lg font-bold text-foreground">{allReports.filter(r => r.report_type === 'Z').length}</p>
                    <p className="text-xs text-muted-foreground">דוחות Z</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-lg font-bold text-foreground">{fmtCurrency(allReports.filter(r => r.report_type === 'Z').reduce((s, r) => s + r.total_amount, 0) / Math.max(allReports.filter(r => r.report_type === 'Z').length, 1))}</p>
                    <p className="text-xs text-muted-foreground">ממוצע יומי</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-lg font-bold text-emerald-600">{fmtCurrency(allReports.filter(r => r.report_type === 'Z').reduce((s, r) => s + r.total_amount, 0))}</p>
                    <p className="text-xs text-muted-foreground">סה"כ</p>
                  </div>
                </div>
              </div>
              {allReports.map(r => (
                <div key={r.id} className="bg-card rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${r.report_type === 'Z' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-orange-500/10 text-orange-700 border-orange-200'}`}>
                        דוח {r.report_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">{fmtCurrency(r.total_amount)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-muted/30 rounded-lg p-2"><p className="text-sm font-bold">{fmtCurrency(r.cash_amount)}</p><p className="text-xs text-muted-foreground">מזומן</p></div>
                    <div className="bg-muted/30 rounded-lg p-2"><p className="text-sm font-bold">{fmtCurrency(r.card_amount)}</p><p className="text-xs text-muted-foreground">אשראי</p></div>
                  </div>
                  {r.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{r.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Reminders tab ─── */}
      {tab === 'reminders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">תזכורות אוטומטיות</p>
            <Button size="sm" onClick={() => { setEditingReminder(null); setReminderForm({ title: '', message: '', reminder_type: 'whatsapp', target_type: 'owner', target_phone: '', staff_id: '', scheduled_time: '09:00', days_of_week: [1,2,3,4,5,6,7], is_active: true }); setReminderSheet(true); }}>
              <Plus className="w-4 h-4 ml-1" />הוסף תזכורת
            </Button>
          </div>

          {/* תבניות מהירות */}
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">תבניות מהירות:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { title: 'דוח X', message: 'זה הזמן לבצע דוח X (חצי יום)', time: '13:00' },
                { title: 'דוח Z', message: 'זה הזמן לבצע דוח Z (סוף יום)', time: '22:00' },
                { title: 'ספירת מלאי', message: 'זה הזמן לבצע ספירת מלאי ולעדכן את המערכת', time: '08:00' },
                { title: 'סוף יום', message: 'תזכורת לסגור משמרת ולעדכן דוח יומי', time: '23:00' },
              ].map(t => (
                <button key={t.title} onClick={() => { setEditingReminder(null); setReminderForm({ title: t.title, message: t.message, reminder_type: 'whatsapp', target_type: 'owner', target_phone: '', staff_id: '', scheduled_time: t.time, days_of_week: [1,2,3,4,5,6,7], is_active: true }); setReminderSheet(true); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-card border border-border hover:border-primary hover:text-primary transition-all">
                  + {t.title}
                </button>
              ))}
            </div>
          </div>

          {reminders.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין תזכורות עדיין</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map(r => {
                const staffName = staffList.find(s => s.id === r.staff_id)?.full_name;
                return (
                  <div key={r.id} className={`bg-card rounded-xl p-4 shadow-sm ${!r.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">{r.title}</p>
                          <Badge variant="outline" className="text-xs">{r.scheduled_time}</Badge>
                          <Badge variant="outline" className="text-xs">{r.target_type === 'owner' ? 'בעל עסק' : r.target_type === 'staff' ? `עובד: ${staffName}` : r.target_phone ?? 'טלפון'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ימים: {r.days_of_week.map(d => DAYS_HE[d - 1]).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.target_phone && (
                          <button onClick={() => sendWhatsApp(r.target_phone!, r.message)}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-colors" title="שלח עכשיו">
                            <Megaphone className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingReminder(r); setReminderForm({ title: r.title, message: r.message, reminder_type: r.reminder_type, target_type: r.target_type, target_phone: r.target_phone ?? '', staff_id: r.staff_id ?? '', scheduled_time: r.scheduled_time, days_of_week: r.days_of_week, is_active: r.is_active }); setReminderSheet(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>למחוק תזכורת?</AlertDialogTitle><AlertDialogDescription>פעולה זו לא ניתנת לביטול.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteReminder(r.id)}>מחק</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Fixed Sheet ─── */}
      <Sheet open={fixedSheet} onOpenChange={setFixedSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingFixed ? 'עריכת הוצאה קבועה' : 'הוצאה קבועה חדשה'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>שם ההוצאה *</Label><Input value={fixedForm.name} onChange={e => setFixedForm(f => ({ ...f, name: e.target.value }))} placeholder="שכירות, חשמל..." /></div>
            <div className="space-y-1">
              <Label>קטגוריה</Label>
              <Select value={fixedForm.category} onValueChange={v => setFixedForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FIXED_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>סכום חודשי (₪)</Label><Input type="number" min={0} value={fixedForm.monthly_amount} onChange={e => setFixedForm(f => ({ ...f, monthly_amount: +e.target.value }))} /></div>
            {fixedForm.monthly_amount > 0 && <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">💡 עלות יומית: {fmtCurrency(fixedForm.monthly_amount / 30)}</div>}
            <div className="space-y-1"><Label>הערות</Label><Textarea value={fixedForm.notes} onChange={e => setFixedForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setFixedSheet(false)}>ביטול</Button>
            <Button onClick={saveFixed} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingFixed ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Variable Sheet ─── */}
      <Sheet open={variableSheet} onOpenChange={setVariableSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingExpense ? 'עריכת הוצאה' : 'הוצאה משתנה חדשה'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={variableForm.date} onChange={e => setVariableForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>קטגוריה</Label>
              <Select value={variableForm.category} onValueChange={v => setVariableForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAILY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>סכום (₪) *</Label><Input type="number" min={0} value={variableForm.amount} onChange={e => setVariableForm(f => ({ ...f, amount: +e.target.value }))} /></div>
            <div className="space-y-1"><Label>תיאור</Label><Input value={variableForm.description} onChange={e => setVariableForm(f => ({ ...f, description: e.target.value }))} placeholder="מה נקנה / מה תוקן..." /></div>
            <div className="space-y-1"><Label>הערות</Label><Textarea value={variableForm.notes} onChange={e => setVariableForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setVariableSheet(false)}>ביטול</Button>
            <Button onClick={saveVariable} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingExpense ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Marketing Sheet ─── */}
      <Sheet open={marketingSheet} onOpenChange={setMarketingSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingCampaign ? 'עריכת קמפיין' : 'קמפיין פרסום חדש'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={marketingForm.date} onChange={e => setMarketingForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>פלטפורמה</Label>
                <Select value={marketingForm.platform} onValueChange={v => setMarketingForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>סוג קמפיין</Label><Input value={marketingForm.campaign_type} onChange={e => setMarketingForm(f => ({ ...f, campaign_type: e.target.value }))} placeholder="מבצע, מוצר..." /></div>
            </div>
            <div className="space-y-1"><Label>סכום השקעה (₪) *</Label><Input type="number" min={0} value={marketingForm.amount} onChange={e => setMarketingForm(f => ({ ...f, amount: +e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>הזמנות מהקמפיין</Label><Input type="number" min={0} value={marketingForm.orders_from_campaign} onChange={e => setMarketingForm(f => ({ ...f, orders_from_campaign: +e.target.value }))} /></div>
              <div className="space-y-1"><Label>הכנסה מהקמפיין (₪)</Label><Input type="number" min={0} value={marketingForm.revenue_from_campaign} onChange={e => setMarketingForm(f => ({ ...f, revenue_from_campaign: +e.target.value }))} /></div>
            </div>
            {marketingForm.amount > 0 && marketingForm.revenue_from_campaign > 0 && (
              <div className={`rounded-xl p-3 text-xs font-semibold ${marketingForm.revenue_from_campaign > marketingForm.amount ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                ROI: {fmtCurrency(marketingForm.revenue_from_campaign - marketingForm.amount)}
                {marketingForm.orders_from_campaign > 0 && ` · עלות/הזמנה: ${fmtCurrency(marketingForm.amount / marketingForm.orders_from_campaign)}`}
              </div>
            )}
            <div className="space-y-1"><Label>הערות</Label><Textarea value={marketingForm.notes} onChange={e => setMarketingForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setMarketingSheet(false)}>ביטול</Button>
            <Button onClick={saveMarketing} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingCampaign ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Report Sheet ─── */}
      <Sheet open={reportSheet} onOpenChange={setReportSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>דוח {reportForm.report_type} — {reportForm.report_type === 'X' ? 'חצי יום' : 'סוף יום'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={reportForm.date} onChange={e => setReportForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>מזומן (₪)</Label><Input type="number" min={0} value={reportForm.cash_amount} onChange={e => setReportForm(f => ({ ...f, cash_amount: +e.target.value }))} /></div>
              <div className="space-y-1"><Label>אשראי (₪)</Label><Input type="number" min={0} value={reportForm.card_amount} onChange={e => setReportForm(f => ({ ...f, card_amount: +e.target.value }))} /></div>
            </div>
            {(reportForm.cash_amount + reportForm.card_amount) > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">סה"כ בקופה</p>
                <p className="text-2xl font-bold text-primary">{fmtCurrency(reportForm.cash_amount + reportForm.card_amount)}</p>
              </div>
            )}
            <div className="space-y-1"><Label>הערות</Label><Textarea value={reportForm.notes} onChange={e => setReportForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setReportSheet(false)}>ביטול</Button>
            <Button onClick={saveReport} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}שמור דוח</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Reminder Sheet ─── */}
      <Sheet open={reminderSheet} onOpenChange={setReminderSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingReminder ? 'עריכת תזכורת' : 'תזכורת חדשה'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>כותרת *</Label><Input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} placeholder="דוח X, ספירת מלאי..." /></div>
            <div className="space-y-1"><Label>הודעה *</Label><Textarea value={reminderForm.message} onChange={e => setReminderForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="תוכן ההודעה שתישלח..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>שעת שליחה</Label><Input type="time" value={reminderForm.scheduled_time} onChange={e => setReminderForm(f => ({ ...f, scheduled_time: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>שולח ל</Label>
                <Select value={reminderForm.target_type} onValueChange={v => setReminderForm(f => ({ ...f, target_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">בעל העסק</SelectItem>
                    <SelectItem value="staff">עובד ספציפי</SelectItem>
                    <SelectItem value="phone">טלפון מותאם</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {reminderForm.target_type === 'staff' && (
              <div className="space-y-1">
                <Label>בחר עובד</Label>
                <Select value={reminderForm.staff_id || 'none'} onValueChange={v => setReminderForm(f => ({ ...f, staff_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="בחר עובד..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">בחר עובד</SelectItem>
                    {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reminderForm.target_type === 'phone' && (
              <div className="space-y-1"><Label>מספר טלפון</Label><Input value={reminderForm.target_phone} onChange={e => setReminderForm(f => ({ ...f, target_phone: e.target.value }))} placeholder="050-0000000" /></div>
            )}
            <div className="space-y-2">
              <Label>ימים פעילים</Label>
              <div className="flex gap-1.5">
                {DAYS_HE.map((d, i) => {
                  const dayNum = i + 1;
                  const active = reminderForm.days_of_week.includes(dayNum);
                  return (
                    <button key={d} onClick={() => setReminderForm(f => ({ ...f, days_of_week: active ? f.days_of_week.filter(n => n !== dayNum) : [...f.days_of_week, dayNum] }))}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={reminderForm.is_active} onCheckedChange={v => setReminderForm(f => ({ ...f, is_active: v }))} />
              <Label>תזכורת פעילה</Label>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setReminderSheet(false)}>ביטול</Button>
            <Button onClick={saveReminder} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingReminder ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default AdminDaily;