import { useState, useEffect, useMemo } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Pencil, Trash2, Loader2, Users, Phone, Calendar,
  ChevronDown, ChevronUp, BarChart2, TrendingUp, AlertTriangle,
  Shield, CheckSquare, Bell, Search, Filter, Mail, Clock,
  Star, UserCheck, UserX, Coffee, Briefcase, X, Check
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────
type StaffRole = {
  id: string; name: string; slug: string; color: string;
  permissions: Record<string, boolean>; is_system: boolean;
};

type StaffMember = {
  id: string; full_name: string; phone: string | null; email: string | null;
  role: string; role_id: string | null; is_active: boolean; notes: string | null;
  salary_type: 'hourly' | 'daily' | 'monthly'; hourly_rate: number;
  daily_rate: number; monthly_rate: number; hire_date: string | null;
  status: string; emergency_contact: string | null; emergency_phone: string | null;
  responsibilities: string[]; internal_notes: string | null; national_id: string | null;
};

type Shift = {
  id: string; staff_id: string; date: string;
  start_time: string; end_time: string; notes: string | null; hours_worked: number | null;
};

type StaffTask = {
  id: string; staff_id: string | null; role_slug: string | null; title: string;
  description: string | null; task_type: string; scheduled_time: string | null;
  priority: string; date: string; status: string; notes: string | null;
};

type Reminder = {
  id: string; title: string; message: string; target_type: string;
  target_phone: string | null; staff_id: string | null;
  scheduled_time: string; days_of_week: number[]; is_active: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SYSTEM_ROLES = [
  { slug: 'owner', name: 'בעלים', color: '#8b5cf6' },
  { slug: 'manager', name: 'מנהל', color: '#3b82f6' },
  { slug: 'shift_manager', name: 'מנהל משמרת', color: '#06b6d4' },
  { slug: 'cashier', name: 'קופאי', color: '#10b981' },
  { slug: 'waiter', name: 'מלצר', color: '#f59e0b' },
  { slug: 'chef', name: 'טבח', color: '#ef4444' },
  { slug: 'kitchen', name: 'עובד מטבח', color: '#f97316' },
  { slug: 'delivery', name: 'שליח', color: '#eab308' },
  { slug: 'warehouse', name: 'אחראי מחסן', color: '#84cc16' },
  { slug: 'inventory', name: 'אחראי מלאי', color: '#22c55e' },
  { slug: 'bartender', name: 'ברמן', color: '#a855f7' },
  { slug: 'cleaning', name: 'ניקיון', color: '#64748b' },
  { slug: 'staff', name: 'עובד כללי', color: '#94a3b8' },
];

const ALL_PERMISSIONS = [
  { key: 'view_orders', label: 'צפייה בהזמנות', group: 'הזמנות' },
  { key: 'edit_order_status', label: 'שינוי סטטוס הזמנה', group: 'הזמנות' },
  { key: 'view_kitchen', label: 'מסך מטבח', group: 'מטבח' },
  { key: 'view_inventory', label: 'צפייה במלאי', group: 'מלאי' },
  { key: 'edit_inventory', label: 'עריכת מלאי', group: 'מלאי' },
  { key: 'inventory_count', label: 'ספירת מלאי', group: 'מלאי' },
  { key: 'view_reports', label: 'צפייה בדוחות', group: 'דוחות' },
  { key: 'submit_xz_report', label: 'הגשת דוח X/Z', group: 'דוחות' },
  { key: 'view_daily_report', label: 'דוח יומי', group: 'דוחות' },
  { key: 'manage_staff', label: 'ניהול עובדים', group: 'ניהול' },
  { key: 'view_salary', label: 'צפייה בשכר', group: 'ניהול' },
  { key: 'manage_expenses', label: 'ניהול הוצאות', group: 'ניהול' },
  { key: 'view_analytics', label: 'אנליטיקות', group: 'ניהול' },
  { key: 'manage_customers', label: 'ניהול לקוחות', group: 'ניהול' },
  { key: 'manage_menu', label: 'ניהול תפריט', group: 'תפריט' },
  { key: 'manage_prices', label: 'ניהול מחירים', group: 'תפריט' },
  { key: 'manage_delivery', label: 'ניהול משלוחים', group: 'משלוחים' },
  { key: 'manage_settings', label: 'הגדרות מערכת', group: 'מערכת' },
  { key: 'send_notifications', label: 'שליחת התראות', group: 'מערכת' },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ALL_PERMISSIONS.map(p => p.key),
  manager: ['view_orders', 'edit_order_status', 'view_kitchen', 'view_inventory', 'edit_inventory', 'view_reports', 'submit_xz_report', 'view_daily_report', 'manage_staff', 'view_salary', 'view_analytics', 'manage_customers', 'manage_menu', 'manage_prices', 'manage_delivery'],
  shift_manager: ['view_orders', 'edit_order_status', 'view_kitchen', 'view_reports', 'submit_xz_report', 'view_daily_report', 'manage_expenses'],
  cashier: ['view_orders', 'edit_order_status', 'submit_xz_report'],
  waiter: ['view_orders', 'edit_order_status'],
  chef: ['view_orders', 'view_kitchen'],
  kitchen: ['view_kitchen'],
  delivery: ['view_orders', 'manage_delivery'],
  warehouse: ['view_inventory', 'edit_inventory', 'inventory_count'],
  inventory: ['view_inventory', 'edit_inventory', 'inventory_count'],
  bartender: ['view_orders', 'edit_order_status'],
  cleaning: [],
  staff: ['view_orders'],
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'פעיל', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  { value: 'inactive', label: 'לא פעיל', color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
  { value: 'vacation', label: 'בחופשה', color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  { value: 'temporary', label: 'זמני', color: 'bg-amber-500/10 text-amber-700 border-amber-200' },
];

const SALARY_LABELS = { hourly: 'שעתי', daily: 'יומי', monthly: 'חודשי' };
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const TASK_PRIORITIES = [
  { value: 'low', label: 'נמוכה', color: 'text-slate-500' },
  { value: 'normal', label: 'רגילה', color: 'text-blue-600' },
  { value: 'high', label: 'גבוהה', color: 'text-orange-600' },
  { value: 'urgent', label: 'דחופה', color: 'text-red-600' },
];

function calcHours(start: string, end: string): number {
  const sp = start.split(':').map(Number);
  const ep = end.split(':').map(Number);
  return Math.max(0, (ep[0] * 60 + (ep[1] ?? 0) - sp[0] * 60 - (sp[1] ?? 0)) / 60);
}

function calcShiftPay(member: StaffMember, shift: Shift): number {
  const hours = shift.hours_worked ?? calcHours(shift.start_time, shift.end_time);
  if (member.salary_type === 'hourly') return hours * member.hourly_rate;
  if (member.salary_type === 'daily') return member.daily_rate;
  return 0;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminStaff = () => {
  const { restaurantId } = useAuth();
  const [tab, setTab] = useState<'list' | 'shifts' | 'tasks' | 'reminders' | 'roles'>('list');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Cards
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [cardTab, setCardTab] = useState<'info' | 'shifts' | 'permissions' | 'tasks' | 'reminders'>('info');

  // Sheets
  const [staffSheet, setStaffSheet] = useState(false);
  const [shiftSheet, setShiftSheet] = useState(false);
  const [taskSheet, setTaskSheet] = useState(false);
  const [reminderSheet, setReminderSheet] = useState(false);
  const [roleSheet, setRoleSheet] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Forms
  const emptyStaffForm: {
    full_name: string; phone: string; email: string; national_id: string; role: string; role_id: string;
    is_active: boolean; status: string; notes: string; internal_notes: string;
    salary_type: 'hourly' | 'daily' | 'monthly';
    hourly_rate: number; daily_rate: number; monthly_rate: number;
    hire_date: string; emergency_contact: string; emergency_phone: string; responsibilities: string[];
  } = {
    full_name: '', phone: '', email: '', national_id: '', role: 'staff', role_id: '',
    is_active: true, status: 'active', notes: '', internal_notes: '',
    salary_type: 'hourly', hourly_rate: 0, daily_rate: 0, monthly_rate: 0,
    hire_date: '', emergency_contact: '', emergency_phone: '', responsibilities: [],
  };
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [shiftForm, setShiftForm] = useState({ date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '17:00', notes: '' });
  const [taskForm, setTaskForm] = useState({ staff_id: '', role_slug: '', title: '', description: '', task_type: 'daily', scheduled_time: '', priority: 'normal', date: new Date().toISOString().split('T')[0] });
  const [reminderForm, setReminderForm] = useState({ title: '', message: '', reminder_type: 'whatsapp', target_type: 'staff', target_phone: '', staff_id: '', scheduled_time: '09:00', days_of_week: [1,2,3,4,5,6,7] as number[], is_active: true });
  const [roleForm, setRoleForm] = useState({ name: '', slug: '', color: '#6b7280', permissions: {} as Record<string, boolean> });

  // Permissions
  const [staffPermissions, setStaffPermissions] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!restaurantId) return;
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const loadAll = async () => {
    setLoading(true);
    const [staffRes, rolesRes, shiftsRes, tasksRes, remindersRes, permsRes] = await Promise.all([
      db.from('staff').select('*').eq('restaurant_id', restaurantId).order('full_name'),
      db.from('staff_roles').select('*').eq('restaurant_id', restaurantId).order('name'),
      db.from('shifts').select('*').eq('restaurant_id', restaurantId).order('date', { ascending: false }),
      db.from('staff_tasks').select('*').eq('restaurant_id', restaurantId).order('scheduled_time'),
      db.from('reminders').select('*').eq('restaurant_id', restaurantId).order('scheduled_time'),
      db.from('staff_permissions').select('*').eq('restaurant_id', restaurantId),
    ]);
    setStaff(staffRes.data ?? []);
    setRoles(rolesRes.data ?? []);
    setShifts(shiftsRes.data ?? []);
    setTasks(tasksRes.data ?? []);
    setReminders(remindersRes.data ?? []);
    // Build permissions map
    const permsMap: Record<string, Record<string, boolean>> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (permsRes.data ?? []).forEach((p: any) => {
      if (!permsMap[p.staff_id]) permsMap[p.staff_id] = {};
      permsMap[p.staff_id][p.permission_key] = p.granted;
    });
    setStaffPermissions(permsMap);
    setLoading(false);
  };

  // ─── Computed ─────────────────────────────────────────────────────────────────

  const allRoles = useMemo(() => {
    const systemRoles = SYSTEM_ROLES.map(r => ({ ...r, id: `system_${r.slug}`, permissions: {}, is_system: true }));
    return [...systemRoles, ...roles];
  }, [roles]);

  const getRoleInfo = (roleSlug: string) => allRoles.find(r => r.slug === roleSlug) ?? { name: roleSlug, color: '#94a3b8' };

  const filteredStaff = useMemo(() => staff.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? '').includes(search);
    const matchRole = filterRole === 'all' || s.role === filterRole;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  }), [staff, search, filterRole, filterStatus]);

  const todayShifts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return shifts.filter(s => s.date === today);
  }, [shifts]);

  const monthlyReport = useMemo(() => staff.map(member => {
    const ms = shifts.filter(s => s.staff_id === member.id && s.date.startsWith(reportMonth));
    const totalH = ms.reduce((sum, s) => sum + (s.hours_worked ?? calcHours(s.start_time, s.end_time)), 0);
    let pay = 0;
    if (member.salary_type === 'hourly') pay = totalH * member.hourly_rate;
    else if (member.salary_type === 'daily') pay = ms.length * member.daily_rate;
    else pay = member.monthly_rate;
    return { ...member, totalHours: totalH, totalDays: ms.length, totalPay: pay };
  }), [staff, shifts, reportMonth]);

  const getEffectivePermissions = (member: StaffMember): Record<string, boolean> => {
    const rolePerms = DEFAULT_ROLE_PERMISSIONS[member.role] ?? [];
    const base: Record<string, boolean> = {};
    rolePerms.forEach(p => { base[p] = true; });
    // Override with staff-specific permissions
    const override = staffPermissions[member.id] ?? {};
    return { ...base, ...override };
  };

  // ─── Staff CRUD ───────────────────────────────────────────────────────────────

  const openCreateStaff = () => {
    setEditingStaff(null);
    setStaffForm(emptyStaffForm);
    setStaffSheet(true);
  };

  const openEditStaff = (s: StaffMember) => {
    setEditingStaff(s);
    setStaffForm({
      full_name: s.full_name, phone: s.phone ?? '', email: s.email ?? '',
      national_id: s.national_id ?? '', role: s.role, role_id: s.role_id ?? '',
      is_active: s.is_active, status: s.status ?? 'active', notes: s.notes ?? '',
      internal_notes: s.internal_notes ?? '',
      salary_type: (s.salary_type ?? 'hourly') as 'hourly' | 'daily' | 'monthly',
      hourly_rate: s.hourly_rate ?? 0, daily_rate: s.daily_rate ?? 0, monthly_rate: s.monthly_rate ?? 0,
      hire_date: s.hire_date ?? '', emergency_contact: s.emergency_contact ?? '',
      emergency_phone: s.emergency_phone ?? '', responsibilities: s.responsibilities ?? [],
    });
    setStaffSheet(true);
  };

  const saveStaff = async () => {
    if (!restaurantId || !staffForm.full_name) { toast({ title: 'שם חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      ...staffForm, restaurant_id: restaurantId,
      role_id: staffForm.role_id || null, hire_date: staffForm.hire_date || null,
      responsibilities: staffForm.responsibilities,
    };
    if (editingStaff) {
      const { data, error } = await db.from('staff').update(payload).eq('id', editingStaff.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      setStaff(prev => prev.map(s => s.id === editingStaff.id ? data : s));
      toast({ title: 'העובד עודכן ✅' });
    } else {
      const { data, error } = await db.from('staff').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', description: error.message, variant: 'destructive' }); setSaving(false); return; }
      setStaff(prev => [...prev, data]);
      toast({ title: 'העובד נוסף ✅' });
    }
    setSaving(false); setStaffSheet(false);
  };

  const deleteStaff = async (id: string) => {
    await db.from('staff').delete().eq('id', id);
    setStaff(prev => prev.filter(s => s.id !== id));
    if (selectedStaff?.id === id) setSelectedStaff(null);
    toast({ title: 'העובד נמחק' });
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await db.from('staff').update({ is_active }).eq('id', id);
    setStaff(prev => prev.map(s => s.id === id ? { ...s, is_active } : s));
  };

  // ─── Shifts ───────────────────────────────────────────────────────────────────

  const saveShift = async () => {
    if (!restaurantId || !selectedStaff) return;
    setSaving(true);
    const { data, error } = await db.from('shifts').insert({ ...shiftForm, restaurant_id: restaurantId, staff_id: selectedStaff.id }).select('*').single();
    setSaving(false);
    if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); return; }
    setShifts(prev => [data, ...prev]);
    toast({ title: 'משמרת נוספה ✅' }); setShiftSheet(false);
  };

  const deleteShift = async (id: string) => {
    await db.from('shifts').delete().eq('id', id);
    setShifts(prev => prev.filter(s => s.id !== id));
  };

  // ─── Tasks ────────────────────────────────────────────────────────────────────

  const saveTask = async () => {
    if (!restaurantId || !taskForm.title) { toast({ title: 'כותרת חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...taskForm, restaurant_id: restaurantId, staff_id: taskForm.staff_id || null, role_slug: taskForm.role_slug || null, scheduled_time: taskForm.scheduled_time || null };
    if (editingTask) {
      const { data, error } = await db.from('staff_tasks').update(payload).eq('id', editingTask.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setTasks(prev => prev.map(t => t.id === editingTask.id ? data : t));
    } else {
      const { data, error } = await db.from('staff_tasks').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setTasks(prev => [...prev, data]);
    }
    toast({ title: 'משימה נשמרה ✅' }); setSaving(false); setTaskSheet(false);
  };

  const updateTaskStatus = async (id: string, status: string) => {
    await db.from('staff_tasks').update({ status, completed_at: status === 'done' ? new Date().toISOString() : null }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTask = async (id: string) => {
    await db.from('staff_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // ─── Reminders ────────────────────────────────────────────────────────────────

  const saveReminder = async () => {
    if (!restaurantId || !reminderForm.title) { toast({ title: 'כותרת חובה', variant: 'destructive' }); return; }
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

  // ─── Permissions ──────────────────────────────────────────────────────────────

  const togglePermission = async (staffId: string, key: string, currentValue: boolean) => {
    const newValue = !currentValue;
    await db.from('staff_permissions').upsert({ restaurant_id: restaurantId, staff_id: staffId, permission_key: key, granted: newValue }, { onConflict: 'staff_id,permission_key' });
    setStaffPermissions(prev => ({ ...prev, [staffId]: { ...(prev[staffId] ?? {}), [key]: newValue } }));
  };

  // ─── Roles ────────────────────────────────────────────────────────────────────

  const saveRole = async () => {
    if (!restaurantId || !roleForm.name) { toast({ title: 'שם חובה', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = { ...roleForm, restaurant_id: restaurantId, slug: roleForm.slug || roleForm.name.replace(/\s/g, '_').toLowerCase() };
    if (editingRole) {
      const { data, error } = await db.from('staff_roles').update(payload).eq('id', editingRole.id).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setRoles(prev => prev.map(r => r.id === editingRole.id ? data : r));
    } else {
      const { data, error } = await db.from('staff_roles').insert(payload).select('*').single();
      if (error) { toast({ title: 'שגיאה', variant: 'destructive' }); setSaving(false); return; }
      setRoles(prev => [...prev, data]);
    }
    toast({ title: 'תפקיד נשמר ✅' }); setSaving(false); setRoleSheet(false);
  };

  const sendWhatsApp = (phone: string, message: string) => {
    const clean = phone.replace(/\D/g, '');
    const intl = clean.startsWith('0') ? `972${clean.slice(1)}` : clean;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const activeCount = staff.filter(s => s.is_active).length;
  const todayCount = todayShifts.length;
  const totalMonthlyCost = monthlyReport.reduce((s, m) => s + m.totalPay, 0);
  const permGroups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ניהול עובדים</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeCount} פעילים · {todayCount} עובדים היום</p>
        </div>
        {tab === 'list' && (
          <Button onClick={openCreateStaff} size="sm">
            <Plus className="w-4 h-4 ml-1" />הוסף עובד
          </Button>
        )}
        {tab === 'tasks' && (
          <Button size="sm" onClick={() => { setEditingTask(null); setTaskForm({ staff_id: selectedStaff?.id ?? '', role_slug: '', title: '', description: '', task_type: 'daily', scheduled_time: '', priority: 'normal', date: new Date().toISOString().split('T')[0] }); setTaskSheet(true); }}>
            <Plus className="w-4 h-4 ml-1" />הוסף משימה
          </Button>
        )}
        {tab === 'reminders' && (
          <Button size="sm" onClick={() => { setEditingReminder(null); setReminderForm({ title: '', message: '', reminder_type: 'whatsapp', target_type: 'staff', target_phone: '', staff_id: '', scheduled_time: '09:00', days_of_week: [1,2,3,4,5,6,7], is_active: true }); setReminderSheet(true); }}>
            <Plus className="w-4 h-4 ml-1" />הוסף תזכורת
          </Button>
        )}
        {tab === 'roles' && (
          <Button size="sm" onClick={() => { setEditingRole(null); setRoleForm({ name: '', slug: '', color: '#6b7280', permissions: {} }); setRoleSheet(true); }}>
            <Plus className="w-4 h-4 ml-1" />הוסף תפקיד
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1">עובדים פעילים</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-foreground">{todayCount}</p>
          <p className="text-xs text-muted-foreground mt-1">עובדים היום</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-foreground">₪{Math.round(totalMonthlyCost).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">שכר חודשי</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { key: 'list', label: 'עובדים', icon: Users },
          { key: 'shifts', label: 'משמרות', icon: Calendar },
          { key: 'tasks', label: 'משימות', icon: CheckSquare },
          { key: 'reminders', label: 'תזכורות', icon: Bell },
          { key: 'roles', label: 'תפקידים', icon: Shield },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1 shrink-0 ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ─── List Tab ─── */}
      {tab === 'list' && (
        <div className="space-y-4">
          {/* Search + Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-36">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש עובד..." className="pr-9 h-9" />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="כל התפקידים" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התפקידים</SelectItem>
                {SYSTEM_ROLES.map(r => <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="כל הסטטוסים" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Staff cards */}
          {filteredStaff.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 shadow-sm text-center">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין עובדים. הוסף עובד ראשון.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.map(member => {
                const roleInfo = getRoleInfo(member.role);
                const statusInfo = STATUS_OPTIONS.find(s => s.value === member.status) ?? STATUS_OPTIONS[0];
                const memberShifts = shifts.filter(s => s.staff_id === member.id);
                const todayShift = todayShifts.find(s => s.staff_id === member.id);
                const isExpanded = selectedStaff?.id === member.id;

                return (
                  <div key={member.id} className={`bg-card rounded-xl shadow-sm overflow-hidden border transition-all ${isExpanded ? 'border-primary/30' : 'border-border/50'}`}>
                    <div className="p-4 flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: roleInfo.color }}>
                        {member.full_name.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">{member.full_name}</p>
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
                          {todayShift && <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-200">עובד היום</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-medium" style={{ color: roleInfo.color }}>{roleInfo.name}</span>
                          {member.phone && (
                            <a href={`tel:${member.phone}`} className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-primary">
                              <Phone className="w-3 h-3" />{member.phone}
                            </a>
                          )}
                          <span className="text-xs text-muted-foreground">{memberShifts.length} משמרות</span>
                          {member.salary_type === 'hourly' && <span className="text-xs text-muted-foreground">₪{member.hourly_rate}/שעה</span>}
                          {member.salary_type === 'daily' && <span className="text-xs text-muted-foreground">₪{member.daily_rate}/יום</span>}
                          {member.salary_type === 'monthly' && <span className="text-xs text-muted-foreground">₪{member.monthly_rate}/חודש</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={member.is_active} onCheckedChange={v => toggleActive(member.id, v)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedStaff(isExpanded ? null : member); setCardTab('info'); }}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStaff(member)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>למחוק {member.full_name}?</AlertDialogTitle><AlertDialogDescription>תמחק גם את כל המשמרות.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteStaff(member.id)}>מחק</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Expanded card */}
                    {isExpanded && (
                      <div className="border-t border-border/50">
                        {/* Card tabs */}
                        <div className="flex gap-0 border-b border-border/50 bg-muted/20">
                          {[
                            { key: 'info', label: 'פרטים', icon: Briefcase },
                            { key: 'shifts', label: 'משמרות', icon: Calendar },
                            { key: 'permissions', label: 'הרשאות', icon: Shield },
                            { key: 'tasks', label: 'משימות', icon: CheckSquare },
                            { key: 'reminders', label: 'תזכורות', icon: Bell },
                          ].map(({ key, label, icon: Icon }) => (
                            <button key={key} onClick={() => setCardTab(key as typeof cardTab)}
                              className={`px-3 py-2 text-xs font-medium flex items-center gap-1 border-b-2 transition-colors ${cardTab === key ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                              <Icon className="w-3 h-3" />{label}
                            </button>
                          ))}
                        </div>

                        <div className="p-4">
                          {/* Info tab */}
                          {cardTab === 'info' && (
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              {member.email && <div><span className="text-muted-foreground">אימייל: </span><span className="font-medium">{member.email}</span></div>}
                              {member.hire_date && <div><span className="text-muted-foreground">תאריך התחלה: </span><span className="font-medium">{new Date(member.hire_date).toLocaleDateString('he-IL')}</span></div>}
                              {member.emergency_contact && <div><span className="text-muted-foreground">חירום: </span><span className="font-medium">{member.emergency_contact} {member.emergency_phone}</span></div>}
                              {member.internal_notes && <div className="col-span-2"><span className="text-muted-foreground">הערות פנימיות: </span><span className="font-medium">{member.internal_notes}</span></div>}
                              {(member.responsibilities ?? []).length > 0 && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">אחריות: </span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(member.responsibilities ?? []).map(r => <span key={r} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[11px]">{r}</span>)}
                                  </div>
                                </div>
                              )}
                              {member.phone && (
                                <div className="col-span-2">
                                  <button onClick={() => sendWhatsApp(member.phone!, `שלום ${member.full_name}, `)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-700 text-xs font-medium hover:bg-green-500/20 transition-colors">
                                    💬 שלח WhatsApp
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Shifts tab */}
                          {cardTab === 'shifts' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="h-7 text-xs w-32" />
                                </div>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShiftForm({ date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '17:00', notes: '' }); setShiftSheet(true); }}>
                                  <Plus className="w-3 h-3 ml-1" />הוסף
                                </Button>
                              </div>
                              {shifts.filter(s => s.staff_id === member.id && s.date.startsWith(reportMonth)).map(shift => {
                                const hours = shift.hours_worked ?? calcHours(shift.start_time, shift.end_time);
                                const pay = calcShiftPay(member, shift);
                                return (
                                  <div key={shift.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2 text-xs">
                                    <span className="font-medium">{fmtDate(shift.date)}</span>
                                    <span className="text-muted-foreground">{shift.start_time}–{shift.end_time}</span>
                                    <span>{hours.toFixed(1)}ש׳</span>
                                    {pay > 0 && <span className="font-semibold text-emerald-700">₪{Math.round(pay)}</span>}
                                    <button onClick={() => deleteShift(shift.id)} className="text-destructive hover:text-destructive/70"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                );
                              })}
                              {/* Monthly summary */}
                              {(() => {
                                const report = monthlyReport.find(r => r.id === member.id);
                                if (!report || report.totalDays === 0) return <p className="text-xs text-muted-foreground text-center py-2">אין משמרות לחודש זה</p>;
                                return (
                                  <div className="flex justify-between items-center bg-primary/5 rounded-xl px-3 py-2 border border-primary/20 text-xs">
                                    <span className="font-semibold">סה"כ {reportMonth}</span>
                                    <span>{report.totalDays} משמרות · {report.totalHours.toFixed(1)} שעות</span>
                                    <span className="font-bold text-primary">₪{Math.round(report.totalPay).toLocaleString()}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Permissions tab */}
                          {cardTab === 'permissions' && (
                            <div className="space-y-4">
                              <p className="text-xs text-muted-foreground">הרשאות מבוססות תפקיד ({getRoleInfo(member.role).name}) + התאמות אישיות</p>
                              {permGroups.map(group => {
                                const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group);
                                const effectivePerms = getEffectivePermissions(member);
                                return (
                                  <div key={group}>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">{group}</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {groupPerms.map(perm => {
                                        const granted = effectivePerms[perm.key] ?? false;
                                        const isOverride = staffPermissions[member.id]?.[perm.key] !== undefined;
                                        return (
                                          <button key={perm.key} onClick={() => togglePermission(member.id, perm.key, granted)}
                                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${granted ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200' : 'bg-muted/30 text-muted-foreground border-border/50'} ${isOverride ? 'ring-1 ring-primary/30' : ''}`}>
                                            {granted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                            {perm.label}
                                            {isOverride && <span className="mr-auto text-primary text-[9px]">מותאם</span>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Tasks tab */}
                          {cardTab === 'tasks' && (
                            <div className="space-y-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => {
                                setEditingTask(null);
                                setTaskForm({ staff_id: member.id, role_slug: '', title: '', description: '', task_type: 'daily', scheduled_time: '', priority: 'normal', date: new Date().toISOString().split('T')[0] });
                                setTaskSheet(true);
                              }}>
                                <Plus className="w-3 h-3 ml-1" />הוסף משימה לעובד זה
                              </Button>
                              {tasks.filter(t => t.staff_id === member.id).length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-3">אין משימות לעובד זה</p>
                              ) : tasks.filter(t => t.staff_id === member.id).map(task => {
                                const priInfo = TASK_PRIORITIES.find(p => p.value === task.priority);
                                return (
                                  <div key={task.id} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                                    <button onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary'}`}>
                                      {task.status === 'done' && <Check className="w-3 h-3" />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                                      <div className="flex gap-2 mt-0.5">
                                        {task.scheduled_time && <span className="text-[10px] text-muted-foreground">{task.scheduled_time}</span>}
                                        <span className={`text-[10px] font-medium ${priInfo?.color}`}>{priInfo?.label}</span>
                                      </div>
                                    </div>
                                    <button onClick={() => deleteTask(task.id)} className="text-destructive hover:text-destructive/70 shrink-0"><X className="w-3 h-3" /></button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reminders tab */}
                          {cardTab === 'reminders' && (
                            <div className="space-y-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => {
                                setEditingReminder(null);
                                setReminderForm({ title: '', message: '', reminder_type: 'whatsapp', target_type: 'staff', target_phone: member.phone ?? '', staff_id: member.id, scheduled_time: '09:00', days_of_week: [1,2,3,4,5,6,7], is_active: true });
                                setReminderSheet(true);
                              }}>
                                <Plus className="w-3 h-3 ml-1" />הוסף תזכורת לעובד זה
                              </Button>
                              {reminders.filter(r => r.staff_id === member.id).length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-3">אין תזכורות לעובד זה</p>
                              ) : reminders.filter(r => r.staff_id === member.id).map(r => (
                                <div key={r.id} className={`flex items-start gap-2 bg-muted/20 rounded-lg px-3 py-2 ${!r.is_active ? 'opacity-50' : ''}`}>
                                  <Bell className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground">{r.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{r.scheduled_time} · {r.days_of_week.map(d => DAYS_HE[d-1]).join(', ')}</p>
                                  </div>
                                  <button onClick={() => deleteReminder(r.id)} className="text-destructive shrink-0"><X className="w-3 h-3" /></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Shifts Tab ─── */}
      {tab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="h-9 text-sm w-36" />
            </div>
            <div className="flex gap-2">
              {todayShifts.length > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-200">
                  {todayShifts.length} עובדים היום
                </Badge>
              )}
            </div>
          </div>

          {/* Today */}
          {todayShifts.length > 0 && (
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-emerald-200/50">
              <p className="text-xs font-semibold text-emerald-700 mb-3 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />עובדים היום
              </p>
              <div className="grid grid-cols-2 gap-2">
                {todayShifts.map(shift => {
                  const member = staff.find(s => s.id === shift.staff_id);
                  if (!member) return null;
                  const roleInfo = getRoleInfo(member.role);
                  return (
                    <div key={shift.id} className="flex items-center gap-2 bg-muted/20 rounded-xl px-3 py-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: roleInfo.color }}>
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{member.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{shift.start_time}–{shift.end_time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly report */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">דוח שכר — {reportMonth}</p>
            {monthlyReport.filter(m => m.totalDays > 0).map(member => {
              const roleInfo = getRoleInfo(member.role);
              return (
                <div key={member.id} className="bg-card rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: roleInfo.color }}>
                      {member.full_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-sm">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{roleInfo.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-600 text-base">₪{Math.round(member.totalPay).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{SALARY_LABELS[member.salary_type ?? 'hourly']}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-sm font-bold">{member.totalDays}</p>
                      <p className="text-[10px] text-muted-foreground">משמרות</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-sm font-bold">{member.totalHours.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">שעות</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2">
                      <p className="text-sm font-bold">{member.salary_type === 'hourly' ? `₪${member.hourly_rate}` : member.salary_type === 'daily' ? `₪${member.daily_rate}` : `₪${member.monthly_rate}`}</p>
                      <p className="text-[10px] text-muted-foreground">תעריף</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {monthlyReport.filter(m => m.totalDays > 0).length === 0 && (
              <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
                <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">אין משמרות לחודש זה</p>
              </div>
            )}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm font-semibold">סה"כ עלות שכר</span>
              <span className="text-lg font-bold text-primary">₪{Math.round(totalMonthlyCost).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tasks Tab ─── */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-9 text-sm w-36" />
          </div>

          {tasks.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <CheckSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין משימות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const member = staff.find(s => s.id === task.staff_id);
                const priInfo = TASK_PRIORITIES.find(p => p.value === task.priority);
                return (
                  <div key={task.id} className={`bg-card rounded-xl p-3 shadow-sm border ${task.status === 'done' ? 'border-emerald-200/50 opacity-70' : 'border-border/50'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'pending' : 'done')}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border hover:border-primary'}`}>
                        {task.status === 'done' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {member && <span className="text-xs text-muted-foreground">{member.full_name}</span>}
                          {task.role_slug && <Badge variant="outline" className="text-xs px-1.5">{getRoleInfo(task.role_slug).name}</Badge>}
                          {task.scheduled_time && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" />{task.scheduled_time}</span>}
                          <span className={`text-xs font-medium ${priInfo?.color}`}>{priInfo?.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditingTask(task);
                          setTaskForm({ staff_id: task.staff_id ?? '', role_slug: task.role_slug ?? '', title: task.title, description: task.description ?? '', task_type: task.task_type, scheduled_time: task.scheduled_time ?? '', priority: task.priority, date: task.date });
                          setTaskSheet(true);
                        }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <button onClick={() => deleteTask(task.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive transition-colors">
                          <Trash2 className="w-3 h-3" />
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

      {/* ─── Reminders Tab ─── */}
      {tab === 'reminders' && (
        <div className="space-y-4">
          {/* Quick templates */}
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">תבניות מהירות:</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { title: 'דוח X', message: 'זה הזמן לדוח X', time: '13:00' },
                { title: 'דוח Z', message: 'זה הזמן לדוח Z', time: '22:00' },
                { title: 'ספירת מלאי', message: 'בצע ספירת מלאי', time: '08:00' },
                { title: 'פתיחת משמרת', message: 'בדוק עובדים ופתח משמרת', time: '09:00' },
                { title: 'סגירת משמרת', message: 'סגור משמרת ועדכן דוח', time: '23:00' },
              ].map(t => (
                <button key={t.title} onClick={() => {
                  setEditingReminder(null);
                  setReminderForm({ title: t.title, message: t.message, reminder_type: 'whatsapp', target_type: 'staff', target_phone: '', staff_id: '', scheduled_time: t.time, days_of_week: [1,2,3,4,5,6,7], is_active: true });
                  setReminderSheet(true);
                }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-card border border-border hover:border-primary hover:text-primary transition-all">
                  + {t.title}
                </button>
              ))}
            </div>
          </div>

          {reminders.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">אין תזכורות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map(r => {
                const staffName = staff.find(s => s.id === r.staff_id)?.full_name;
                return (
                  <div key={r.id} className={`bg-card rounded-xl p-4 shadow-sm border border-border/50 ${!r.is_active ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">{r.title}</p>
                          <Badge variant="outline" className="text-xs">{r.scheduled_time}</Badge>
                          {staffName && <Badge variant="outline" className="text-xs">{staffName}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">ימים: {r.days_of_week.map(d => DAYS_HE[d-1]).join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.target_phone && (
                          <button onClick={() => sendWhatsApp(r.target_phone!, r.message)}
                            className="p-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20">
                            💬
                          </button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditingReminder(r);
                          setReminderForm({ title: r.title, message: r.message, reminder_type: 'whatsapp', target_type: r.target_type, target_phone: r.target_phone ?? '', staff_id: r.staff_id ?? '', scheduled_time: r.scheduled_time, days_of_week: r.days_of_week, is_active: r.is_active });
                          setReminderSheet(true);
                        }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <button onClick={() => deleteReminder(r.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive">
                          <Trash2 className="w-3 h-3" />
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

      {/* ─── Roles Tab ─── */}
      {tab === 'roles' && (
        <div className="space-y-4">
          {/* System roles */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">תפקידי מערכת (מובנים)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SYSTEM_ROLES.map(r => {
                const count = staff.filter(s => s.role === r.slug).length;
                return (
                  <div key={r.slug} className="bg-card rounded-xl p-3 border border-border/50 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: r.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{count} עובדים · {DEFAULT_ROLE_PERMISSIONS[r.slug]?.length ?? 0} הרשאות</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom roles */}
          {roles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">תפקידים מותאמים</p>
              <div className="space-y-2">
                {roles.map(role => (
                  <div key={role.id} className="bg-card rounded-xl p-3 shadow-sm border border-border/50 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ background: role.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{role.name}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                      setEditingRole(role);
                      setRoleForm({ name: role.name, slug: role.slug, color: role.color, permissions: role.permissions ?? {} });
                      setRoleSheet(true);
                    }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Staff Sheet ─── */}
      <Sheet open={staffSheet} onOpenChange={setStaffSheet}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingStaff ? 'עריכת עובד' : 'הוספת עובד'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>שם מלא *</Label><Input value={staffForm.full_name} onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>טלפון</Label><Input value={staffForm.phone} onChange={e => setStaffForm(f => ({ ...f, phone: e.target.value }))} placeholder="050-0000000" /></div>
              <div className="space-y-1"><Label>אימייל</Label><Input value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>תעודת זהות</Label><Input value={staffForm.national_id} onChange={e => setStaffForm(f => ({ ...f, national_id: e.target.value }))} /></div>
              <div className="space-y-1"><Label>תאריך תחילת עבודה</Label><Input type="date" value={staffForm.hire_date} onChange={e => setStaffForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>תפקיד</Label>
                <Select value={staffForm.role} onValueChange={v => setStaffForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SYSTEM_ROLES.map(r => <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>)}
                    {roles.map(r => <SelectItem key={r.id} value={r.slug}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>סטטוס</Label>
                <Select value={staffForm.status} onValueChange={v => setStaffForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* שכר */}
            <div className="bg-muted/30 rounded-xl p-3 space-y-3">
              <Label className="font-semibold">תנאי שכר</Label>
              <Select value={staffForm.salary_type} onValueChange={v => setStaffForm(f => ({ ...f, salary_type: v as typeof f.salary_type }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">שעתי</SelectItem>
                  <SelectItem value="daily">יומי קבוע</SelectItem>
                  <SelectItem value="monthly">חודשי קבוע</SelectItem>
                </SelectContent>
              </Select>
              {staffForm.salary_type === 'hourly' && <div className="space-y-1"><Label className="text-xs">₪ לשעה</Label><Input type="number" min={0} value={staffForm.hourly_rate} onChange={e => setStaffForm(f => ({ ...f, hourly_rate: +e.target.value }))} /></div>}
              {staffForm.salary_type === 'daily' && <div className="space-y-1"><Label className="text-xs">₪ ליום</Label><Input type="number" min={0} value={staffForm.daily_rate} onChange={e => setStaffForm(f => ({ ...f, daily_rate: +e.target.value }))} /></div>}
              {staffForm.salary_type === 'monthly' && <div className="space-y-1"><Label className="text-xs">₪ לחודש</Label><Input type="number" min={0} value={staffForm.monthly_rate} onChange={e => setStaffForm(f => ({ ...f, monthly_rate: +e.target.value }))} /></div>}
            </div>

            {/* חירום */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>איש קשר לחירום</Label><Input value={staffForm.emergency_contact} onChange={e => setStaffForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="שם" /></div>
              <div className="space-y-1"><Label>טלפון חירום</Label><Input value={staffForm.emergency_phone} onChange={e => setStaffForm(f => ({ ...f, emergency_phone: e.target.value }))} placeholder="050-..." /></div>
            </div>

            <div className="space-y-1"><Label>הערות פנימיות</Label><Textarea value={staffForm.internal_notes} onChange={e => setStaffForm(f => ({ ...f, internal_notes: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-3"><Switch checked={staffForm.is_active} onCheckedChange={v => setStaffForm(f => ({ ...f, is_active: v }))} /><Label>עובד פעיל</Label></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setStaffSheet(false)}>ביטול</Button>
            <Button onClick={saveStaff} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingStaff ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Shift Sheet ─── */}
      <Sheet open={shiftSheet} onOpenChange={setShiftSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>הוספת משמרת — {selectedStaff?.full_name}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={shiftForm.date} onChange={e => setShiftForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>שעת התחלה</Label><Input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div className="space-y-1"><Label>שעת סיום</Label><Input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            {shiftForm.start_time && shiftForm.end_time && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                ⏱ {calcHours(shiftForm.start_time, shiftForm.end_time).toFixed(1)} שעות
              </div>
            )}
            <div className="space-y-1"><Label>הערות</Label><Input value={shiftForm.notes} onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setShiftSheet(false)}>ביטול</Button>
            <Button onClick={saveShift} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}הוסף</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Task Sheet ─── */}
      <Sheet open={taskSheet} onOpenChange={setTaskSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingTask ? 'עריכת משימה' : 'משימה חדשה'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>כותרת *</Label><Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="ספירת מלאי, ניקיון, בדיקת קופה..." /></div>
            <div className="space-y-1"><Label>תיאור</Label><Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>שייך לעובד</Label>
                <Select value={taskForm.staff_id || 'none'} onValueChange={v => setTaskForm(f => ({ ...f, staff_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="כל העובדים" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">כל העובדים</SelectItem>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>לפי תפקיד</Label>
                <Select value={taskForm.role_slug || 'none'} onValueChange={v => setTaskForm(f => ({ ...f, role_slug: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="כל התפקידים" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">כל התפקידים</SelectItem>
                    {SYSTEM_ROLES.map(r => <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>שעה</Label><Input type="time" value={taskForm.scheduled_time} onChange={e => setTaskForm(f => ({ ...f, scheduled_time: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>עדיפות</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>תאריך</Label><Input type="date" value={taskForm.date} onChange={e => setTaskForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setTaskSheet(false)}>ביטול</Button>
            <Button onClick={saveTask} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingTask ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Reminder Sheet ─── */}
      <Sheet open={reminderSheet} onOpenChange={setReminderSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingReminder ? 'עריכת תזכורת' : 'תזכורת חדשה'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>כותרת *</Label><Input value={reminderForm.title} onChange={e => setReminderForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label>הודעה</Label><Textarea value={reminderForm.message} onChange={e => setReminderForm(f => ({ ...f, message: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>שעה</Label><Input type="time" value={reminderForm.scheduled_time} onChange={e => setReminderForm(f => ({ ...f, scheduled_time: e.target.value }))} /></div>
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
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(reminderForm.target_type === 'phone' || reminderForm.target_type === 'staff') && (
              <div className="space-y-1"><Label>מספר טלפון לשליחה</Label><Input value={reminderForm.target_phone} onChange={e => setReminderForm(f => ({ ...f, target_phone: e.target.value }))} placeholder="050-..." /></div>
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
            <div className="flex items-center gap-3"><Switch checked={reminderForm.is_active} onCheckedChange={v => setReminderForm(f => ({ ...f, is_active: v }))} /><Label>פעיל</Label></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setReminderSheet(false)}>ביטול</Button>
            <Button onClick={saveReminder} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingReminder ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ─── Role Sheet ─── */}
      <Sheet open={roleSheet} onOpenChange={setRoleSheet}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto" dir="rtl">
          <SheetHeader><SheetTitle>{editingRole ? 'עריכת תפקיד' : 'תפקיד מותאם חדש'}</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1"><Label>שם התפקיד *</Label><Input value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} placeholder="שם התפקיד..." /></div>
            <div className="space-y-1"><Label>צבע</Label><Input type="color" value={roleForm.color} onChange={e => setRoleForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-16 p-1 cursor-pointer" /></div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setRoleSheet(false)}>ביטול</Button>
            <Button onClick={saveRole} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-1 animate-spin" />}{editingRole ? 'עדכן' : 'הוסף'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default AdminStaff;