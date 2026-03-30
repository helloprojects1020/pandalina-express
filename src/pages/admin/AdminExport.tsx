import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Download, Loader2, FileText, X, Printer,
  TrendingUp, Users, ShoppingBag,
  ChevronDown, ChevronLeft, ChevronRight, Calendar,
  BarChart2, Package, ChefHat
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── helpers ──────────────────────────────────────────────────────────────────
function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
}
function downloadCSV(content: string, filename: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' })), download: filename });
  a.click();
}
function fmtDate(d: string) { return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtDateTime(d: string) { return new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function printReport(title: string, subtitle: string, headers: string[], rows: (string | number | null)[][]) {
  const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"/><title>${title}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#0f172a;padding:24px;direction:rtl;background:#fff}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0f172a}
  .brand-name{font-size:18px;font-weight:900;letter-spacing:-0.5px;color:#0f172a}.brand-sub{font-size:10px;color:#64748b;margin-top:2px}
  h1{font-size:16px;font-weight:700;color:#0f172a;margin-bottom:4px}
  .meta{font-size:10px;color:#64748b;margin-bottom:20px;display:flex;gap:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#0f172a;color:#fff;padding:9px 12px;text-align:right;font-size:10px;font-weight:600;letter-spacing:0.3px}
  td{padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:10px;color:#1e293b}
  tr:nth-child(even) td{background:#f8fafc}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}
  @media print{@page{margin:15mm}}</style></head>
  <body><div class="brand"><div class="brand-name">Bitelyx</div><div class="brand-sub">מערכת ניהול עסקי מקצועית</div></div>
  <h1>${title}</h1><div class="meta"><span>📅 ${subtitle}</span><span>🕐 ${new Date().toLocaleString('he-IL')}</span><span>📊 ${rows.length} רשומות</span></div>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r, i) => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <div class="footer"><span>© Bitelyx Platform</span><span>דוח זה הופק אוטומטית</span></div>
  <script>window.onload=()=>window.print()</script></body></html>`;  const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const DAYS_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function MiniCalendar({ from, to, onChange }: { from: Date | null; to: Date | null; onChange: (from: Date, to: Date) => void }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selecting, setSelecting] = useState<Date | null>(null);
  const [pickingYear, setPickingYear] = useState(false);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = (firstDay.getDay() + 1) % 7;
  const days: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(viewYear, viewMonth, d));

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const clickDay = (d: Date) => {
    if (!selecting) { setSelecting(d); }
    else { if (d < selecting) { onChange(d, selecting); } else { onChange(selecting, d); } setSelecting(null); }
  };

  const isInRange = (d: Date) => !!(from && to && d >= from && d <= to);
  const isEdge = (d: Date) => !!(from && d.toDateString() === from.toDateString()) || !!(to && d.toDateString() === to.toDateString());

  // שנים: 10 שנים אחורה + 5 קדימה
  const years = Array.from({ length: 16 }, (_, i) => today.getFullYear() - 10 + i);

  if (pickingYear) return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setPickingYear(false)} className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5" />חזרה
        </button>
        <span className="text-sm font-semibold text-slate-800">בחר שנה</span>
        <div className="w-12" />
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {years.map(y => (
          <button key={y} onClick={() => { setViewYear(y); setPickingYear(false); }}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${y === viewYear ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700'}`}>
            {y}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
        <button onClick={() => setPickingYear(true)}
          className="text-sm font-semibold text-slate-800 hover:text-slate-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-all">
          {MONTHS_HE[viewMonth]} {viewYear}
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS_HE.map(d => <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => !d ? <div key={i} /> : (
          <button key={i} onClick={() => clickDay(d)}
            className={`h-8 w-full rounded-lg text-xs font-medium transition-all ${isEdge(d) ? 'bg-slate-900 text-white shadow-md' : isInRange(d) ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-700'} ${selecting?.toDateString() === d.toDateString() ? 'ring-2 ring-slate-900' : ''}`}>
            {d.getDate()}
          </button>
        ))}
      </div>
      {selecting && <p className="text-center text-xs text-slate-400 mt-2">בחר תאריך סיום</p>}
    </div>
  );
}

// ─── Date Picker Button ───────────────────────────────────────────────────────
function DateSelector({ from, to, onChange }: { from: Date | null; to: Date | null; onChange: (f: Date | null, t: Date | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const label = from && to
    ? `${from.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })} — ${to.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : 'בחר תקופה';

  const presets = [
    { label: '7 ימים', days: 7 }, { label: '30 יום', days: 30 },
    { label: '3 חודשים', days: 90 }, { label: 'שנה', days: 365 },
  ];

  const applyPreset = (days: number) => {
    const t = new Date(); const f = new Date(); f.setDate(f.getDate() - days);
    onChange(f, t); setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${open ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'}`}>
        <Calendar className="w-4 h-4" />
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 w-80" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          {/* Presets */}
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {presets.map(p => (
              <button key={p.days} onClick={() => applyPreset(p.days)}
                className="px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 transition-all">
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-4 mb-4">
            <MiniCalendar from={from} to={to} onChange={(f, t) => { onChange(f, t); setOpen(false); }} />
          </div>
          {(from || to) && (
            <button onClick={() => { onChange(null, null); setOpen(false); }}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-900 transition-colors">
              נקה בחירה
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Staff/Item filter modal ──────────────────────────────────────────────────
function FilterModal({ title, options, selected, onSelect, onClose }: {
  title: string; options: { id: string; label: string }[];
  selected: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()} dir="rtl"
        style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          <button onClick={() => { onSelect('all'); onClose(); }}
            className={`w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selected === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
            כולם
          </button>
          {options.map(o => (
            <button key={o.id} onClick={() => { onSelect(o.id); onClose(); }}
              className={`w-full text-right px-3 py-2.5 rounded-xl text-sm transition-all ${selected === o.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
type PreviewData = { title: string; subtitle: string; headers: string[]; rows: (string | number | null)[][] };

function PreviewModal({ data, onClose, onPrint, onCSV }: {
  data: PreviewData; onClose: () => void;
  onPrint: () => void; onCSV: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{data.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{data.subtitle} · {data.rows.length} רשומות</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm">
            <Printer className="w-4 h-4" />הדפסה / PDF
          </button>
          <button onClick={onCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />CSV
          </button>
          <button onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-900">
                  {data.headers.map((h, i) => (
                    <th key={i} className="text-right px-4 py-3 text-xs font-semibold text-white tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={data.headers.length} className="text-center py-16 text-slate-400 text-sm">אין נתונים לתקופה זו</td></tr>
                ) : data.rows.map((row, ri) => (
                  <tr key={ri} className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{cell ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminExport = () => {
  const { restaurantId } = useAuth();
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const [staffList, setStaffList] = useState<{ id: string; label: string }[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [showStaffFilter, setShowStaffFilter] = useState(false);
  const [staffMonth, setStaffMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // הזמנות
  const [orderStatus, setOrderStatus] = useState('all');
  const [orderType, setOrderType] = useState('all');
  const [showOrderFilter, setShowOrderFilter] = useState(false);

  // מנות
  const [itemsSort, setItemsSort] = useState<'popular' | 'unpopular'>('popular');
  const [showItemsFilter, setShowItemsFilter] = useState(false);

  // הכנסות
  const [revenueGroupBy, setRevenueGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [showRevenueFilter, setShowRevenueFilter] = useState(false);

  // לקוחות
  const [customerMin, setCustomerMin] = useState(1);
  const [showCustomerFilter, setShowCustomerFilter] = useState(false);

  const getDateBounds = () => {
    if (dateFrom && dateTo) return { start: dateFrom.toISOString(), end: new Date(dateTo.getTime() + 86399999).toISOString() };
    const d = new Date(); const f = new Date(); f.setDate(f.getDate() - 30);
    return { start: f.toISOString(), end: d.toISOString() };
  };

  const getSubtitle = () => {
    if (dateFrom && dateTo) return `${dateFrom.toLocaleDateString('he-IL')} — ${dateTo.toLocaleDateString('he-IL')}`;
    return '30 ימים אחרונים';
  };

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrders = async () => {
    const { start, end } = getDateBounds();
    let q = db.from('orders').select('*').eq('restaurant_id', restaurantId)
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false });
    if (orderStatus !== 'all') q = q.eq('status', orderStatus);
    if (orderType !== 'all') q = q.eq('order_type', orderType);
    const { data, error } = await q;
    if (error) throw new Error('שגיאה בטעינת הזמנות');
    const statusMap: Record<string, string> = { new: 'חדשה', preparing: 'בהכנה', ready: 'מוכנה', completed: 'הושלמה', cancelled: 'בוטלה' };
    const typeMap: Record<string, string> = { pickup: 'איסוף', delivery: 'משלוח', dine_in: 'ישיבה' };
    const headers = ['#', 'תאריך', 'שעה', 'שם לקוח', 'טלפון', 'סוג', 'סטטוס', 'סה"כ ₪', 'משלוח ₪'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []).map((o: any, i: number) => [
      i + 1, fmtDate(o.created_at),
      new Date(o.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      o.customer_name ?? '', o.customer_phone ?? '',
      typeMap[o.order_type] ?? o.order_type, statusMap[o.status] ?? o.status,
      o.total ?? 0, o.delivery_fee ?? 0,
    ]);
    return { headers, rows };
  };

  const fetchRevenue = async () => {
    const { start, end } = getDateBounds();
    const { data, error } = await db.from('orders').select('created_at, total, order_type')
      .eq('restaurant_id', restaurantId).neq('status', 'cancelled')
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: true });
    if (error) throw new Error('שגיאה');

    const getKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (revenueGroupBy === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (revenueGroupBy === 'week') {
        const startOfWeek = new Date(d); startOfWeek.setDate(d.getDate() - d.getDay());
        return fmtDate(startOfWeek.toISOString());
      }
      return fmtDate(dateStr);
    };

    const byPeriod: Record<string, { date: string; orders: number; revenue: number; delivery: number; pickup: number; dine: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).forEach((o: any) => {
      const key = getKey(o.created_at);
      if (!byPeriod[key]) byPeriod[key] = { date: key, orders: 0, revenue: 0, delivery: 0, pickup: 0, dine: 0 };
      byPeriod[key].orders++; byPeriod[key].revenue += Number(o.total ?? 0);
      if (o.order_type === 'delivery') byPeriod[key].delivery++;
      else if (o.order_type === 'pickup') byPeriod[key].pickup++;
      else byPeriod[key].dine++;
    });
    const groupLabel = revenueGroupBy === 'day' ? 'תאריך' : revenueGroupBy === 'week' ? 'שבוע מ-' : 'חודש';
    const headers = [groupLabel, 'הזמנות', 'הכנסה ₪', 'ממוצע ₪', 'משלוחים', 'איסוף', 'ישיבה'];
    const rows = Object.values(byPeriod).map(d => [d.date, d.orders, Math.round(d.revenue), d.orders ? Math.round(d.revenue / d.orders) : 0, d.delivery, d.pickup, d.dine]);
    return { headers, rows };
  };

  const fetchItems = async (popular: boolean) => {
    const { start, end } = getDateBounds();
    const { data: ordersData } = await db.from('orders').select('id').eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled').gte('created_at', start).lte('created_at', end);
    if (!ordersData?.length) throw new Error('אין נתונים לתקופה זו');
    const { data, error } = await db.from('order_items').select('menu_item_name, quantity, line_total').in('order_id', ordersData.map((o: { id: string }) => o.id));
    if (error) throw new Error('שגיאה');
    const byItem: Record<string, { name: string; qty: number; revenue: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).forEach((item: any) => {
      const name = item.menu_item_name ?? 'לא ידוע';
      if (!byItem[name]) byItem[name] = { name, qty: 0, revenue: 0 };
      byItem[name].qty += Number(item.quantity ?? 0);
      byItem[name].revenue += Number(item.line_total ?? 0);
    });
    const sorted = Object.values(byItem).sort((a, b) => (itemsSort === 'popular' ? 1 : -1) * (b.qty - a.qty));
    const headers = ['דירוג', 'שם מנה', 'כמות', 'הכנסה ₪', '% מהכנסות'];
    const totalRevenue = sorted.reduce((s, i) => s + i.revenue, 0);
    const rows = sorted.map((item, i) => [i + 1, item.name, item.qty, Math.round(item.revenue), totalRevenue > 0 ? `${((item.revenue / totalRevenue) * 100).toFixed(1)}%` : '0%']);
    return { headers, rows };
  };

  const fetchStaff = async () => {
    const { data: staffData, error } = await db.from('staff').select('*').eq('restaurant_id', restaurantId).order('full_name');
    if (error) throw new Error('שגיאה');
    setStaffList((staffData ?? []).map((s: { id: string; full_name: string }) => ({ id: s.id, label: s.full_name })));
    const { data: shiftsData } = await db.from('shifts').select('*').eq('restaurant_id', restaurantId)
      .gte('date', `${staffMonth}-01`).lte('date', `${staffMonth}-31`);
    const shifts = shiftsData ?? [];
    const calcH = (s: string, e: string) => { const [sh, sm] = s.split(':').map(Number); const [eh, em] = e.split(':').map(Number); return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60); };
    const roleMap: Record<string, string> = { manager: 'מנהל', cashier: 'קופאי', waiter: 'מלצר', chef: 'טבח', delivery: 'שליח', staff: 'עובד' };
    const headers = ['שם עובד', 'תפקיד', 'סוג שכר', 'תעריף', 'משמרות', 'שעות', 'שכר ₪'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRows = (staffData ?? []).map((s: any) => {
      const ms = shifts.filter((sh: { staff_id: string }) => sh.staff_id === s.id);
      const totalH = ms.reduce((sum: number, sh: { hours_worked: number | null; start_time: string; end_time: string }) => sum + (sh.hours_worked ?? calcH(sh.start_time, sh.end_time)), 0);
      let pay = 0;
      if (s.salary_type === 'hourly') pay = totalH * (s.hourly_rate ?? 0);
      else if (s.salary_type === 'daily') pay = ms.length * (s.daily_rate ?? 0);
      else pay = s.monthly_rate ?? 0;
      const rate = s.salary_type === 'hourly' ? `₪${s.hourly_rate}/שעה` : s.salary_type === 'daily' ? `₪${s.daily_rate}/יום` : `₪${s.monthly_rate}/חודש`;
      return { staffId: s.id, row: [s.full_name, roleMap[s.role] ?? s.role, s.salary_type === 'hourly' ? 'שעתי' : s.salary_type === 'daily' ? 'יומי' : 'חודשי', rate, ms.length, totalH.toFixed(1), Math.round(pay)] };
    });
    const rows = selectedStaff === 'all' ? allRows.map((r: { staffId: string; row: (string | number | null)[] }) => r.row) : allRows.filter((r: { staffId: string; row: (string | number | null)[] }) => r.staffId === selectedStaff).map((r: { staffId: string; row: (string | number | null)[] }) => r.row);
    return { headers, rows };
  };

  const fetchCustomers = async () => {
    const { start, end } = getDateBounds();
    const { data, error } = await db.from('orders').select('customer_name, customer_phone, total, status, created_at')
      .eq('restaurant_id', restaurantId).not('customer_phone', 'is', null)
      .gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false });
    if (error) throw new Error('שגיאה');
    const map: Record<string, { name: string; phone: string; orders: number; total: number; last: string; cancelled: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data ?? []).forEach((o: any) => {
      const p = o.customer_phone ?? ''; if (!p) return;
      if (!map[p]) map[p] = { name: o.customer_name ?? '', phone: p, orders: 0, total: 0, last: o.created_at, cancelled: 0 };
      map[p].orders++; map[p].total += Number(o.total ?? 0);
      if (o.status === 'cancelled') map[p].cancelled++;
    });
    const headers = ['שם לקוח', 'טלפון', 'הזמנות', 'סה"כ ₪', 'ממוצע ₪', 'ביטולים', 'הזמנה אחרונה'];
    const rows = Object.values(map)
      .filter(c => c.orders >= customerMin)
      .sort((a, b) => b.orders - a.orders)
      .map(c => [c.name, c.phone, c.orders, Math.round(c.total), Math.round(c.total / c.orders), c.cancelled, fmtDateTime(c.last)]);
    return { headers, rows };
  };

  const fetchInventory = async () => {
    const { data, error } = await db.from('inventory_items').select('*, suppliers(name)').eq('restaurant_id', restaurantId).order('name');
    if (error) throw new Error('שגיאה');
    const headers = ['שם מוצר', 'יחידה', 'כמות במלאי', 'מינימום', 'עלות ₪', 'ספק', 'סטטוס'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []).map((i: any) => [
      i.name, i.unit, i.current_stock, i.min_stock, i.cost_price,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i.suppliers as any)?.name ?? '—',
      i.min_stock > 0 && i.current_stock <= i.min_stock ? '⚠️ נמוך' : '✅ תקין',
    ]);
    return { headers, rows };
  };

  // ─── Action handler ──────────────────────────────────────────────────────────

  const handle = async (id: string, title: string, fetchFn: () => Promise<{ headers: string[]; rows: (string | number | null)[][] }>, action: 'preview' | 'print' | 'csv') => {
    setLoading(`${id}-${action}`);
    try {
      const { headers, rows } = await fetchFn();
      const subtitle = id === 'staff' ? `${MONTHS_HE[parseInt(staffMonth.split('-')[1]) - 1]} ${staffMonth.split('-')[0]}` : getSubtitle();
      if (action === 'preview') setPreview({ title, subtitle, headers, rows });
      else if (action === 'print') printReport(title, subtitle, headers, rows);
      else { downloadCSV(toCSV(headers, rows), `${title}_${subtitle.replace(/\s/g, '_')}.csv`); toast({ title: `${title} יוצא ✅` }); }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'שגיאה', variant: 'destructive' });
    } finally { setLoading(null); }
  };

  // ─── Reports config ──────────────────────────────────────────────────────────

  const FilterPill = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-900 hover:text-white text-xs font-medium text-slate-700 transition-all border border-slate-200 group/pill">
      {label}<ChevronDown className="w-3 h-3 opacity-50 group-hover/pill:opacity-100" />
    </button>
  );

  const reports = [
    {
      id: 'orders', title: 'הזמנות', desc: 'כל ההזמנות עם פרטי לקוח, סטטוסים וסכומים',
      icon: ShoppingBag, color: '#3b82f6', fetch: fetchOrders,
      extra: (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          <FilterPill label={orderStatus === 'all' ? 'כל הסטטוסים' : { new: 'חדשות', preparing: 'בהכנה', ready: 'מוכנות', completed: 'הושלמו', cancelled: 'בוטלו' }[orderStatus] ?? orderStatus}
            onClick={() => setShowOrderFilter(true)} />
          <FilterPill label={orderType === 'all' ? 'כל הסוגים' : { pickup: 'איסוף', delivery: 'משלוח', dine_in: 'ישיבה' }[orderType] ?? orderType}
            onClick={() => setShowOrderFilter(true)} />
        </div>
      ),
    },
    {
      id: 'revenue', title: 'הכנסות', desc: 'ניתוח הכנסות עם ממוצע וחלוקה לפי סוג הזמנה',
      icon: TrendingUp, color: '#10b981', fetch: fetchRevenue,
      extra: (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">קיבוץ לפי:</span>
          {(['day', 'week', 'month'] as const).map(g => (
            <button key={g} onClick={() => setRevenueGroupBy(g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${revenueGroupBy === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'}`}>
              {g === 'day' ? 'יום' : g === 'week' ? 'שבוע' : 'חודש'}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'items', title: 'מנות', desc: 'ניתוח מנות לפי כמות מכירות והכנסות',
      icon: ChefHat, color: '#f59e0b', fetch: () => fetchItems(itemsSort === 'popular'),
      extra: (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">מיון:</span>
          {(['popular', 'unpopular'] as const).map(s => (
            <button key={s} onClick={() => setItemsSort(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${itemsSort === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'}`}>
              {s === 'popular' ? '🔥 פופולריות' : '📉 חלשות'}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'customers', title: 'לקוחות', desc: 'לקוחות עם היסטוריית הזמנות וסכומים',
      icon: Users, color: '#8b5cf6', fetch: fetchCustomers,
      extra: (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">מינימום הזמנות:</span>
          {[1, 2, 3, 5].map(n => (
            <button key={n} onClick={() => setCustomerMin(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${customerMin === n ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'}`}>
              {n}+
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'inventory', title: 'מלאי', desc: 'מצב מלאי נוכחי עם עלויות והתראות',
      icon: Package, color: '#06b6d4', fetch: fetchInventory,
    },
    {
      id: 'staff', title: 'עובדים ושכר', desc: 'שעות, משמרות ושכר לפי עובד וחודש',
      icon: Users, color: '#14b8a6', fetch: fetchStaff,
      extra: (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          <button onClick={() => { fetchStaff().then(() => setShowStaffFilter(true)); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-900 hover:text-white text-xs font-medium text-slate-700 transition-all border border-slate-200">
            <Users className="w-3.5 h-3.5" />
            {selectedStaff === 'all' ? 'כל העובדים' : staffList.find(s => s.id === selectedStaff)?.label ?? 'עובד'}
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input type="month" value={staffMonth} onChange={e => setStaffMonth(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-transparent border-none outline-none w-28" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Reports</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">דוחות ונתונים</h1>
            <p className="text-slate-500 mt-1 text-sm">נתוני האמת של העסק שלך — בכל פורמט שתרצה</p>
          </div>
          <DateSelector from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
        </div>

        {/* Active period badge */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-500">תקופה פעילה: <span className="text-slate-900">{getSubtitle()}</span></span>
        </div>

        {/* Reports grid */}
        <div className="space-y-3">
          {reports.map(report => {
            const Icon = report.icon;
            const isAnyLoading = (s: string) => ['preview', 'print', 'csv'].some(a => loading === `${s}-${a}`);

            return (
              <div key={report.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                      style={{ background: `${report.color}15` }}>
                      <Icon className="w-5 h-5" style={{ color: report.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base">{report.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{report.desc}</p>
                      {report.extra}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Preview */}
                      <button
                        disabled={!!loading}
                        onClick={() => handle(report.id, report.title, report.fetch, 'preview')}
                        className="group/btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 hover:border-slate-900 disabled:opacity-40">
                        {loading === `${report.id}-preview` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">צפה</span>
                      </button>

                      {/* Print */}
                      <button
                        disabled={!!loading}
                        onClick={() => handle(report.id, report.title, report.fetch, 'print')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 hover:border-slate-900 disabled:opacity-40">
                        {loading === `${report.id}-print` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {/* CSV */}
                      <button
                        disabled={!!loading}
                        onClick={() => handle(report.id, report.title, report.fetch, 'csv')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all bg-slate-900 hover:bg-slate-700 text-white disabled:opacity-40">
                        {loading === `${report.id}-csv` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Excel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="h-0.5 w-0 group-hover:w-full transition-all duration-500 ease-out" style={{ background: `linear-gradient(90deg, ${report.color}, ${report.color}80)` }} />
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">3 פורמטים לכל דוח</p>
            <p className="text-xs text-slate-500">📄 צפייה בדפדפן · 🖨️ שמירה כ-PDF · ⬇️ Excel/CSV</p>
          </div>
        </div>
      </div>

      {/* Staff filter modal */}
      {showStaffFilter && (
        <FilterModal title="בחר עובד" options={staffList} selected={selectedStaff}
          onSelect={setSelectedStaff} onClose={() => setShowStaffFilter(false)} />
      )}

      {/* Orders filter modal */}
      {showOrderFilter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowOrderFilter(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()} dir="rtl"
            style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">פילטר הזמנות</h3>
              <button onClick={() => setShowOrderFilter(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">סטטוס הזמנה</p>
                <div className="flex flex-wrap gap-1.5">
                  {[['all', 'הכל'], ['new', 'חדשות'], ['preparing', 'בהכנה'], ['ready', 'מוכנות'], ['completed', 'הושלמו'], ['cancelled', 'בוטלו']].map(([v, l]) => (
                    <button key={v} onClick={() => setOrderStatus(v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${orderStatus === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">סוג הזמנה</p>
                <div className="flex flex-wrap gap-1.5">
                  {[['all', 'הכל'], ['delivery', 'משלוח'], ['pickup', 'איסוף'], ['dine_in', 'ישיבה']].map(([v, l]) => (
                    <button key={v} onClick={() => setOrderType(v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${orderType === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowOrderFilter(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-all">
                אישור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview fullscreen */}
      {preview && (
        <PreviewModal
          data={preview}
          onClose={() => setPreview(null)}
          onPrint={() => printReport(preview.title, preview.subtitle, preview.headers, preview.rows)}
          onCSV={() => { downloadCSV(toCSV(preview.headers, preview.rows), `${preview.title}.csv`); toast({ title: 'הורד ✅' }); }}
        />
      )}
    </div>
  );
};

export default AdminExport;