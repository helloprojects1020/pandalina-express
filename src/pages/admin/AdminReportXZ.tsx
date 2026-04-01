import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Area } from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  FileText, RefreshCw, Calendar, Lock, MessageCircle,
  Target, Zap, ChevronDown, ChevronUp, Eye, Download,
  Printer, Wifi,
} from 'lucide-react';
import { PageHeader, SectionCard, EmptyState, LoadingState } from '@/components/admin/AdminUI';
import { FeatureGate } from '@/components/admin/FeatureGate';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

/** נתונים חיים של יום אחד — מחושב מ-orders בזמן אמת */
interface LiveDay {
  date: string;
  revenue: number;
  cash: number;
  card: number;
  ordersCount: number;
  staffCost: number;
  dailyExpenses: number;
  fixedExpenses: number;
  totalExpenses: number;
  profit: number;
  margin: number;
  hasClosedZ: boolean;   // האם קיים Z נסגר לאותו יום
  closedAt: string | null;
}

/** נתוני snapshot נעולים של יום Z — נשמרו ברגע הסגירה */
interface LockedDay {
  date: string;
  revenue: number;       // מ-daily_reports.total_amount
  cash: number;          // מ-daily_reports.cash_amount
  card: number;          // מ-daily_reports.card_amount
  ordersCount: number;   // מ-daily_reports.orders_count
  staffCost: number;     // עלות עובדים בזמן הסגירה (מחושב live — לא משתנה)
  dailyExpenses: number;
  fixedExpenses: number;
  totalExpenses: number;
  profit: number;
  margin: number;
  closedAt: string;      // חובה — Z תמיד יש closed_at
}

interface Summary {
  totalRevenue: number;
  totalOrders: number;
  totalStaffCost: number;
  totalExpenses: number;
  totalProfit: number;
  weightedMargin: number;
  avgOrderValue: number;
  staffRatio: number;
}

// DB rows
interface OrderRow    { total: number | string; payment_method: string; created_at: string; }
interface ShiftRow    { date: string; hours_worked: number | string; staff: { hourly_rate: number | string } | null; }
interface ExpenseRow  { date: string; amount: number | string; }
interface FixedRow    { monthly_amount: number | string; }
interface ZReportRow  {
  date: string; report_type: string;
  cash_amount: number | string; card_amount: number | string;
  total_amount: number | string; orders_count: number | string | null;
  closed_at: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// PURE HELPERS
// ═══════════════════════════════════════════════════════════════════
const n = (v: unknown): number => { const x = Number(v); return isFinite(x) ? x : 0; };
const fmt = (v: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const makeDateRange = (from: string, to: string): string[] => {
  const dates: string[] = [];
  const [fy,fm,fd] = from.split('-').map(Number);
  const [ty,tm,td] = to.split('-').map(Number);
  const cur = new Date(fy, fm-1, fd);
  const end = new Date(ty, tm-1, td);
  while (cur <= end) {
    dates.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
    cur.setDate(cur.getDate()+1);
  }
  return dates;
};
const isoToDate = (iso: string) => iso.slice(0,10);
const heDayFull = (d: string) => {
  const [y,m,day] = d.split('-').map(Number);
  return new Date(y,m-1,day).toLocaleDateString('he-IL',{weekday:'short',day:'numeric',month:'numeric'});
};
const calcCosts = (date: string, shifts: ShiftRow[], dailyExp: ExpenseRow[], dailyFixed: number) => {
  const staffCost    = shifts.filter(s=>s.date===date).reduce((s,sh)=>s+n(sh.hours_worked)*n(sh.staff?.hourly_rate),0);
  const dailyExpenses = dailyExp.filter(e=>e.date===date).reduce((s,e)=>s+n(e.amount),0);
  return { staffCost, dailyExpenses, fixedExpenses: dailyFixed, totalExpenses: staffCost+dailyExpenses+dailyFixed };
};
const calcSummary = (days: (LiveDay|LockedDay)[]): Summary => {
  const totalRevenue   = days.reduce((s,d)=>s+d.revenue,0);
  const totalOrders    = days.reduce((s,d)=>s+d.ordersCount,0);
  const totalStaffCost = days.reduce((s,d)=>s+d.staffCost,0);
  const totalExpenses  = days.reduce((s,d)=>s+d.totalExpenses,0);
  const totalProfit    = days.reduce((s,d)=>s+d.profit,0);
  return {
    totalRevenue, totalOrders, totalStaffCost, totalExpenses, totalProfit,
    weightedMargin: totalRevenue>0?(totalProfit/totalRevenue)*100:0,
    avgOrderValue:  totalOrders>0?totalRevenue/totalOrders:0,
    staffRatio:     totalRevenue>0?(totalStaffCost/totalRevenue)*100:0,
  };
};

// ═══════════════════════════════════════════════════════════════════
// BUILD FUNCTIONS — completely separate for X and Z
// ═══════════════════════════════════════════════════════════════════

/** בנה LiveDay מ-orders בזמן אמת */
const buildLiveDay = (
  date: string, orders: OrderRow[], shifts: ShiftRow[],
  dailyExp: ExpenseRow[], dailyFixed: number, zReport: ZReportRow | undefined,
): LiveDay => {
  const dayOrders = orders.filter(o=>isoToDate(o.created_at)===date);
  const revenue   = dayOrders.reduce((s,o)=>s+n(o.total),0);
  const cash      = dayOrders.filter(o=>o.payment_method==='cash').reduce((s,o)=>s+n(o.total),0);
  const costs     = calcCosts(date, shifts, dailyExp, dailyFixed);
  const profit    = revenue - costs.totalExpenses;
  return {
    date, revenue, cash, card: revenue-cash, ordersCount: dayOrders.length,
    ...costs, profit, margin: revenue>0?(profit/revenue)*100:0,
    hasClosedZ: !!zReport && zReport.report_type==='Z',
    closedAt:   zReport?.closed_at ?? null,
  };
};

/** בנה LockedDay מ-snapshot נעול — רק אם קיים Z סגור */
const buildLockedDay = (
  date: string, zReport: ZReportRow, shifts: ShiftRow[],
  dailyExp: ExpenseRow[], dailyFixed: number,
): LockedDay => {
  const revenue = n(zReport.total_amount);
  const cash    = n(zReport.cash_amount);
  const card    = n(zReport.card_amount);
  const costs   = calcCosts(date, shifts, dailyExp, dailyFixed);
  const profit  = revenue - costs.totalExpenses;
  return {
    date, revenue, cash, card, ordersCount: n(zReport.orders_count),
    ...costs, profit, margin: revenue>0?(profit/revenue)*100:0,
    closedAt: zReport.closed_at!,
  };
};

// ═══════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════
function buildHtml(days: (LiveDay|LockedDay)[], summary: Summary, storeName: string, dateLabel: string, reportType: 'X'|'Z', printMode: boolean): string {
  const isZ = reportType==='Z';
  const rows = days.map((d,i)=>{
    const profitColor = d.profit>=0?'#059669':'#dc2626';
    const staffWarn   = d.revenue>0 && d.staffCost/d.revenue>0.4;
    const bg          = i%2===0?'#fff':'#f8fafc';
    const src = isZ ? '🔒נעול' : '🔄live';
    return `<tr style="background:${bg}">
      <td style="font-weight:600">${heDayFull(d.date)}</td>
      <td style="text-align:center">${d.ordersCount}</td>
      <td style="color:#059669;font-weight:700">${fmt(d.revenue)}</td>
      <td>${fmt(d.cash)}</td><td>${fmt(d.card)}</td>
      <td style="color:${staffWarn?'#ea580c':'inherit'}">${fmt(d.staffCost)}${staffWarn?' ⚠️':''}</td>
      <td>${fmt(d.dailyExpenses)}</td><td>${fmt(d.fixedExpenses)}</td>
      <td style="font-weight:600">${fmt(d.totalExpenses)}</td>
      <td style="color:${profitColor};font-weight:700">${fmt(d.profit)}</td>
      <td>${d.margin.toFixed(1)}%</td>
      <td style="text-align:center;font-size:9px">${src}</td>
    </tr>`;
  }).join('');

  const insights: string[] = [];
  if (summary.staffRatio>40) insights.push(`<div class="ins warn">⚠️ עלות עובדים גבוהה: ${summary.staffRatio.toFixed(1)}%</div>`);
  if (summary.weightedMargin<15&&summary.totalRevenue>0) insights.push(`<div class="ins warn">📉 רווחיות נמוכה: ${summary.weightedMargin.toFixed(1)}%</div>`);
  if (summary.totalProfit>0&&summary.weightedMargin>=25) insights.push(`<div class="ins ok">✅ ביצועים טובים: מרווח ${summary.weightedMargin.toFixed(1)}%</div>`);
  insights.push(`<div class="ins info">🛒 ממוצע הזמנה: ${fmt(summary.avgOrderValue)}</div>`);

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"/>
<title>דוח ${reportType} — ${storeName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#0f172a;background:#f1f5f9;direction:rtl}
.page{max-width:1100px;margin:0 auto;padding:28px 32px;background:#fff;min-height:100vh}
.toolbar{position:sticky;top:0;background:#1e293b;color:#fff;padding:10px 20px;display:flex;align-items:center;gap:12px;z-index:100}
.toolbar button{background:#f97316;color:#fff;border:none;padding:6px 18px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer}
.toolbar .sec{background:#475569}
.toolbar .info{margin-right:auto;font-size:11px;color:#94a3b8}
.header{display:flex;justify-content:space-between;padding-bottom:18px;border-bottom:3px solid #0f172a;margin-bottom:20px}
.logo{font-size:26px;font-weight:900;letter-spacing:-1.5px}.logo span{color:#f97316}
.store{font-size:13px;font-weight:600;color:#475569;margin-top:3px}
.badge{display:inline-flex;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:800;margin-top:8px;
  background:${isZ?'#fee2e2':'#fef9c3'};color:${isZ?'#991b1b':'#854d0e'};border:1.5px solid ${isZ?'#fca5a5':'#fde047'}}
.meta{text-align:left;font-size:11px;color:#64748b;line-height:1.8}
.meta strong{color:#334155}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.kpi{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px}
.kpi-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin-bottom:5px}
.kpi-value{font-size:20px;font-weight:900;line-height:1}
.kpi-sub{font-size:9px;color:#94a3b8;margin-top:3px}
.green{color:#059669}.blue{color:#2563eb}.orange{color:#ea580c}.violet{color:#7c3aed}.red{color:#dc2626}
.section{font-size:12px;font-weight:800;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #f1f5f9}
.insights{margin-bottom:18px}.ins{padding:6px 12px;margin-bottom:5px;border-radius:8px;font-size:10px;font-weight:500}
.warn{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}
.ok{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.info{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
table{width:100%;border-collapse:collapse;font-size:10px}
thead tr{background:#0f172a}
th{color:#fff;padding:8px 10px;text-align:right;font-size:9px;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #f1f5f9}
.total-row td{background:#1e293b!important;color:#fff!important;font-weight:700}
.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
@media print{.toolbar{display:none!important}body{background:#fff}.page{padding:12mm}@page{margin:8mm;size:A4 landscape}}
</style></head><body>
${!printMode?`<div class="toolbar">
  <span style="font-weight:800;font-size:15px">Bitelyx</span>
  <span style="color:#94a3b8">|</span>
  <span>דוח ${reportType} — ${storeName} — ${dateLabel}</span>
  <span class="info">הופק: ${new Date().toLocaleString('he-IL')}</span>
  <button class="sec" onclick="window.close()">✕ סגור</button>
  <button onclick="window.print()">🖨 הדפס / PDF</button>
</div>`:''}
<div class="page">
  <div class="header">
    <div>
      <div class="logo">Bite<span>lyx</span></div>
      <div class="store">${storeName}</div>
      <div class="badge">${isZ?'🔴 דוח Z — סגירה רשמית של כל היום':'🟡 דוח X — snapshot זמני של הקופה בזמן אמת'}</div>
    </div>
    <div class="meta">
      <div><strong>תקופה:</strong> ${dateLabel}</div>
      <div><strong>סוג:</strong> ${isZ?'דוח Z — נתוני סגירה נעולים':'דוח X — נתונים חיים'}</div>
      <div><strong>ימים:</strong> ${days.length} | <strong>הזמנות:</strong> ${summary.totalOrders}</div>
      <div><strong>הופק:</strong> ${new Date().toLocaleString('he-IL')}</div>
    </div>
  </div>
  <div class="section">💰 סיכום כספי</div>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">הכנסות</div><div class="kpi-value green">${fmt(summary.totalRevenue)}</div><div class="kpi-sub">${summary.totalOrders} הזמנות • ממוצע ${fmt(summary.avgOrderValue)}</div></div>
    <div class="kpi"><div class="kpi-label">עלות עובדים</div><div class="kpi-value ${summary.staffRatio>40?'orange':'blue'}">${fmt(summary.totalStaffCost)}</div><div class="kpi-sub">${summary.staffRatio.toFixed(1)}% מההכנסות${summary.staffRatio>40?' ⚠️':''}</div></div>
    <div class="kpi"><div class="kpi-label">סה״כ הוצאות</div><div class="kpi-value orange">${fmt(summary.totalExpenses)}</div><div class="kpi-sub">קבועות + עובדים + שוטפות</div></div>
    <div class="kpi"><div class="kpi-value ${summary.totalProfit>=0?'violet':'red'}">${fmt(summary.totalProfit)}</div><div class="kpi-sub">מרווח: ${summary.weightedMargin.toFixed(1)}%</div></div>
  </div>
  <div class="insights"><div class="section">💡 תובנות</div>${insights.join('')}</div>
  <div class="section">📋 פירוט יומי</div>
  <table><thead><tr>
    <th>תאריך</th><th style="text-align:center">הזמנות</th><th>הכנסות</th><th>מזומן</th><th>כרטיס</th>
    <th>עובדים</th><th>הוצאות שוטפות</th><th>קבועות</th><th>סה״כ הוצאות</th><th>רווח</th><th>מרווח</th><th>מקור</th>
  </tr></thead><tbody>
    ${rows}
    <tr class="total-row">
      <td>✦ סה״כ</td><td style="text-align:center">${summary.totalOrders}</td>
      <td>${fmt(summary.totalRevenue)}</td>
      <td>${fmt(days.reduce((s,d)=>s+d.cash,0))}</td>
      <td>${fmt(days.reduce((s,d)=>s+d.card,0))}</td>
      <td>${fmt(summary.totalStaffCost)}</td>
      <td>${fmt(days.reduce((s,d)=>s+d.dailyExpenses,0))}</td>
      <td>${fmt(days.reduce((s,d)=>s+d.fixedExpenses,0))}</td>
      <td>${fmt(summary.totalExpenses)}</td>
      <td>${fmt(summary.totalProfit)}</td>
      <td>${summary.weightedMargin.toFixed(1)}%</td><td></td>
    </tr>
  </tbody></table>
  <div class="footer">
    <div>© ${new Date().getFullYear()} Bitelyx | דוח זה הופק אוטומטית</div>
    <div>${storeName} | דוח ${reportType} | ${dateLabel}</div>
  </div>
</div>
${printMode?'<script>window.onload=()=>window.print()</script>':''}
</body></html>`;
}

function openFullReport(days: (LiveDay|LockedDay)[], summary: Summary, storeName: string, dateLabel: string, rt: 'X'|'Z') {
  const w = window.open('','_blank');
  if(w){w.document.write(buildHtml(days,summary,storeName,dateLabel,rt,false));w.document.close();}
}
function printReport(days: (LiveDay|LockedDay)[], summary: Summary, storeName: string, dateLabel: string, rt: 'X'|'Z') {
  const w = window.open('','_blank');
  if(w){w.document.write(buildHtml(days,summary,storeName,dateLabel,rt,true));w.document.close();}
}
function downloadCSV(days: (LiveDay|LockedDay)[], summary: Summary, storeName: string, dateLabel: string, rt: 'X'|'Z') {
  const esc = (v: string|number) => `"${String(v).replace(/"/g,'""')}"`;
  const headers = ['תאריך','הזמנות','הכנסות','מזומן','כרטיס','עובדים','הוצאות שוטפות','קבועות','סה״כ הוצאות','רווח','מרווח %','מקור'];
  const rows = days.map(d=>[
    heDayFull(d.date),d.ordersCount,d.revenue,d.cash,d.card,
    d.staffCost,d.dailyExpenses,d.fixedExpenses,d.totalExpenses,
    d.profit,d.margin.toFixed(1),rt==='Z'?'Z נעול':'X live',
  ].map(esc).join(','));
  const total = ['סה״כ',summary.totalOrders,summary.totalRevenue,
    days.reduce((s,d)=>s+d.cash,0),days.reduce((s,d)=>s+d.card,0),
    summary.totalStaffCost,days.reduce((s,d)=>s+d.dailyExpenses,0),
    days.reduce((s,d)=>s+d.fixedExpenses,0),
    summary.totalExpenses,summary.totalProfit,summary.weightedMargin.toFixed(1),''].map(esc).join(',');
  const csv = '\uFEFF'+[`"דוח ${rt} — ${storeName} — ${dateLabel}"`,headers.map(esc).join(','),...rows,total].join('\r\n');
  const a = Object.assign(document.createElement('a'),{
    href: URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),
    download: `דוח_${rt}_${storeName}_${dateLabel.replace(/[\s/]/g,'_')}.csv`,
  });
  a.click();
}
function sendWhatsApp(summary: Summary, storeName: string, dateLabel: string, rt: 'X'|'Z') {
  const lines = [
    `📊 דוח ${rt} — ${storeName}`,
    `📅 ${dateLabel}`,
    rt==='X'?'🟡 snapshot זמני — נתונים חיים':'🔴 סגירה רשמית — נתונים נעולים',
    ``,
    `💰 הכנסות:  ${fmt(summary.totalRevenue)} (${summary.totalOrders} הזמנות)`,
    `👥 עובדים:  ${fmt(summary.totalStaffCost)} (${summary.staffRatio.toFixed(1)}%)`,
    `📦 הוצאות: ${fmt(summary.totalExpenses)}`,
    `${summary.totalProfit>=0?'✅':'❌'} רווח:    ${fmt(summary.totalProfit)} (${summary.weightedMargin.toFixed(1)}%)`,
    ``,
    summary.staffRatio>40?`⚠️ עלות עובדים גבוהה — ${summary.staffRatio.toFixed(1)}%`:`✅ יחס עובדים תקין`,
  ];
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`,'_blank');
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function ReportBanner({ reportType, summary, liveDays, lockedDays }:{
  reportType:'X'|'Z'; summary:Summary|null;
  liveDays:LiveDay[]; lockedDays:(LockedDay|null)[];
}) {
  if(reportType==='X') {
    if(!summary) return null;
    const isProfit = summary.totalProfit>=0;
    return (
      <div className={`rounded-2xl p-4 border-2 flex items-start gap-4 ${isProfit?'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800':'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'}`}>
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xl shrink-0">🟡</div>
        <div className="flex-1">
          <p className="font-black text-foreground">דוח X — snapshot זמני של הקופה בזמן אמת</p>
          <p className="text-xs text-muted-foreground mt-0.5">נתונים חיים מה-orders • משתנה עם כל הזמנה חדשה • לא נועל קופה</p>
          <p className={`text-sm font-bold mt-1.5 ${isProfit?'text-emerald-700':'text-red-600'}`}>
            {isProfit?`✅ רווח נקי: ${fmt(summary.totalProfit)} (${fmtPct(summary.weightedMargin)})`:`❌ הפסד: ${fmt(summary.totalProfit)}`}
          </p>
        </div>
        <div className="shrink-0 text-left">
          <p className="text-xs text-muted-foreground">{summary.totalOrders} הזמנות</p>
          <p className="text-sm font-black text-foreground">{fmt(summary.totalRevenue)}</p>
        </div>
      </div>
    );
  }

  // Z mode
  const closedCount = lockedDays.filter(Boolean).length;
  const openCount   = lockedDays.filter(d=>!d).length;

  if(closedCount===0) {
    return (
      <div className="rounded-2xl p-4 border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">⚠️</div>
        <div>
          <p className="font-black text-amber-800 dark:text-amber-300">אין דוחות Z סגורים לתקופה זו</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">כל הימים בטווח הנבחר טרם נסגרו. כדי לסגור יום — עבור לדוח X ולחץ "סגור יום (Z)"</p>
        </div>
      </div>
    );
  }

  if(!summary) return null;
  const isProfit = summary.totalProfit>=0;
  return (
    <div className={`rounded-2xl p-4 border-2 flex items-start gap-4 ${isProfit?'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800':'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'}`}>
      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center text-xl shrink-0">🔴</div>
      <div className="flex-1">
        <p className="font-black text-foreground">דוח Z — נתוני סגירה רשמיים ונעולים של כל היום</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {closedCount} ימים נסגרו • {openCount>0?`${openCount} ימים טרם נסגרו (מציגים "לא נסגר")`:'כל הימים נסגרו'} • לא משתנה לאחר הסגירה
        </p>
        <p className={`text-sm font-bold mt-1.5 ${isProfit?'text-emerald-700':'text-red-600'}`}>
          {isProfit?`✅ רווח נקי: ${fmt(summary.totalProfit)} (${fmtPct(summary.weightedMargin)})`:`❌ הפסד: ${fmt(summary.totalProfit)}`}
        </p>
      </div>
      <div className="shrink-0 text-left">
        <p className="text-xs text-muted-foreground">{summary.totalOrders} הזמנות</p>
        <p className="text-sm font-black text-foreground">{fmt(summary.totalRevenue)}</p>
      </div>
    </div>
  );
}

function KpiCard({label,value,sub,sub2,icon:Icon,accent,barPct,warn}:{
  label:string;value:string;sub?:string;sub2?:string;
  icon:React.ElementType;accent:string;barPct?:number;warn?:boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 border bg-card overflow-hidden relative ${warn?'border-orange-300':'border-border'}`}>
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] ${accent}`}/>
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${accent} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4 text-white"/></div>
      </div>
      <p className="text-3xl font-black text-foreground leading-none tracking-tight">{value}</p>
      {sub  && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      {sub2 && <p className={`text-xs mt-0.5 font-medium ${warn?'text-orange-500':'text-muted-foreground'}`}>{sub2}</p>}
      {barPct!==undefined&&(
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${barPct>60?'bg-red-500':barPct>40?'bg-orange-400':'bg-blue-500'}`} style={{width:`${Math.min(100,Math.max(0,barPct))}%`}}/>
          </div>
        </div>
      )}
      {warn&&<div className="flex items-center gap-1 mt-1.5 text-orange-500 text-[11px] font-medium"><AlertTriangle className="w-3 h-3 shrink-0"/>גבוה מהמומלץ</div>}
    </div>
  );
}

function InsightsPanel({summary,days}:{summary:Summary;days:(LiveDay|LockedDay)[]}) {
  const items:[string,string,'warn'|'ok'|'info'][] = [];
  if(summary.staffRatio>40) items.push(['!',`עלות עובדים ${fmtPct(summary.staffRatio)} — כדאי לצמצם משמרות`,'warn']);
  if(summary.weightedMargin<15&&summary.totalRevenue>0) items.push(['↓',`רווחיות נמוכה (${fmtPct(summary.weightedMargin)}) — בחן הוצאות`,'warn']);
  if(summary.avgOrderValue<60&&summary.avgOrderValue>0) items.push(['↑',`ממוצע הזמנה נמוך (${fmt(summary.avgOrderValue)}) — שקול upsell`,'info']);
  if(summary.totalProfit>0&&summary.weightedMargin>=30) items.push(['★',`מרווח מעולה! ${fmtPct(summary.weightedMargin)} — מעל ממוצע הענף`,'ok']);
  const lossDay = days.find(d=>d.profit<0&&d.revenue>0);
  if(lossDay) items.push(['!',`${heDayFull(lossDay.date)}: יום הפסד (${fmt(lossDay.profit)})`,'warn']);
  if(items.length===0) items.push(['✓','כל המדדים תקינים לתקופה זו','ok']);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-amber-500"/><h3 className="font-bold text-sm">תובנות עסקיות</h3></div>
      <div className="space-y-2">
        {items.map(([icon,text,level],i)=>(
          <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium ${level==='warn'?'bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300':level==='ok'?'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300':'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300'}`}>
            <span className="text-sm shrink-0">{icon}</span><span className="leading-snug">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalBlock({revenue,goal,setGoal}:{revenue:number;goal:number;setGoal:(g:number)=>void}) {
  const pct = goal>0?Math.min(100,(revenue/goal)*100):0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><Target className="w-4 h-4 text-violet-500"/><h3 className="font-bold text-sm">יעד הכנסות</h3></div>
        <input type="number" value={goal} onChange={e=>setGoal(Number(e.target.value))} className="w-24 text-xs text-right border border-border rounded-lg px-2 py-1.5 bg-background text-foreground"/>
      </div>
      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-black text-foreground">{fmt(revenue)}</span>
        <span className="text-xs text-muted-foreground">מתוך {fmt(goal)}</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${pct>=100?'bg-emerald-500':pct>=60?'bg-blue-500':'bg-violet-500'}`} style={{width:`${pct}%`}}/>
      </div>
      <p className={`text-xs mt-1.5 font-semibold ${pct>=100?'text-emerald-600':'text-muted-foreground'}`}>{pct>=100?'🎉 יעד הושג!':`${pct.toFixed(0)}% מהיעד`}</p>
    </div>
  );
}

function RevenueChart({days}:{days:(LiveDay|LockedDay)[]}) {
  if(days.length===0) return null;
  const data = days.map(d=>({
    name: new Date(d.date).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'}),
    הכנסות: d.revenue, הוצאות: d.totalExpenses, רווח: d.profit,
  }));
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold text-sm text-foreground mb-4">גרף הכנסות / הוצאות / רווח</h3>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{top:4,right:4,left:0,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)"/>
          <XAxis dataKey="name" tick={{fontSize:11}}/>
          <YAxis tick={{fontSize:11}} tickFormatter={v=>`₪${(v/1000).toFixed(0)}k`}/>
          <Tooltip formatter={(v:number)=>fmt(v)}/>
          <Bar dataKey="הכנסות" fill="#10b981" radius={[4,4,0,0]} opacity={0.85}/>
          <Bar dataKey="הוצאות" fill="#f97316" radius={[4,4,0,0]} opacity={0.75}/>
          <Line type="monotone" dataKey="רווח" stroke="#8b5cf6" strokeWidth={2.5} dot={{r:4,fill:'#8b5cf6'}}/>
          <Area type="monotone" dataKey="רווח" fill="#8b5cf6" fillOpacity={0.08} stroke="none"/>
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"/>הכנסות</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500 inline-block"/>הוצאות</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"/>רווח</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
function AdminReportXZ() {
  const { restaurantId } = useAuth();

  const [reportType,  setReportType]  = useState<'X'|'Z'>('X');
  const [mode,        setMode]        = useState<'day'|'range'>('day');
  const [dateFrom,    setDateFrom]    = useState(todayStr);
  const [dateTo,      setDateTo]      = useState(todayStr);
  const [loading,     setLoading]     = useState(false);

  // Completely separate state for X and Z
  const [liveDays,    setLiveDays]    = useState<LiveDay[]>([]);
  const [lockedDays,  setLockedDays]  = useState<(LockedDay|null)[]>([]); // null = no Z for that date

  const [closingDay,  setClosingDay]  = useState<string|null>(null);
  const [expandedDay, setExpandedDay] = useState<string|null>(null);
  const [goal,        setGoal]        = useState(5000);
  const [storeName,   setStoreName]   = useState('המסעדה');

  useEffect(()=>{
    if(!restaurantId) return;
    db.from('restaurants').select('name').eq('id',restaurantId).maybeSingle()
      .then(({data}:{data:{name:string}|null})=>{ if(data?.name) setStoreName(data.name); });
  },[restaurantId]);

  const fetchReport = useCallback(async()=>{
    if(!restaurantId) return;
    setLoading(true);
    try {
      const from  = dateFrom;
      const to    = mode==='day'?dateFrom:dateTo;
      const dates = makeDateRange(from,to);

      const [ordersRes,shiftsRes,dailyExpRes,fixedExpRes,reportsRes] = await Promise.all([
        db.from('orders').select('total,payment_method,created_at')
          .eq('restaurant_id',restaurantId)
          .gte('created_at',`${from}T00:00:00`).lte('created_at',`${to}T23:59:59`)
          .neq('status','cancelled'),
        db.from('shifts').select('date,hours_worked,staff:staff_id(hourly_rate)')
          .eq('restaurant_id',restaurantId).gte('date',from).lte('date',to),
        db.from('daily_expenses').select('date,amount')
          .eq('restaurant_id',restaurantId).gte('date',from).lte('date',to),
        db.from('fixed_expenses').select('monthly_amount')
          .eq('restaurant_id',restaurantId).eq('is_active',true),
        db.from('daily_reports')
          .select('date,report_type,cash_amount,card_amount,total_amount,orders_count,closed_at')
          .eq('restaurant_id',restaurantId).gte('date',from).lte('date',to),
      ]);

      const orders:    OrderRow[]   = ordersRes.data   ?? [];
      const shifts:    ShiftRow[]   = shiftsRes.data   ?? [];
      const dailyExp:  ExpenseRow[] = dailyExpRes.data ?? [];
      const fixedExp:  FixedRow[]   = fixedExpRes.data ?? [];
      const zReports:  ZReportRow[] = reportsRes.data  ?? [];

      const monthlyFixed = fixedExp.reduce((s,e)=>s+n(e.monthly_amount),0);
      const dailyFixed   = monthlyFixed/30;

      // ── X: always live from orders ──────────────────────────────
      const live = dates.map(date=>
        buildLiveDay(date,orders,shifts,dailyExp,dailyFixed,
          zReports.find(r=>r.date===date&&r.report_type==='Z'))
      );
      setLiveDays(live);

      // ── Z: only from locked snapshots ───────────────────────────
      const locked = dates.map(date=>{
        const zr = zReports.find(r=>r.date===date&&r.report_type==='Z'&&r.closed_at!==null);
        if(!zr) return null; // no Z for this date
        return buildLockedDay(date,zr,shifts,dailyExp,dailyFixed);
      });
      setLockedDays(locked);

    } catch(e){ console.error('fetchReport error:',e); }
    finally{ setLoading(false); }
  },[restaurantId,dateFrom,dateTo,mode]);

  useEffect(()=>{ fetchReport(); },[fetchReport]);

  // ── Which days/summary to display based on reportType ──────────
  const displayDays: (LiveDay|LockedDay)[] = useMemo(()=>{
    if(reportType==='X') return liveDays;
    // Z: only show days that have a locked snapshot
    return lockedDays.filter((d): d is LockedDay => d!==null);
  },[reportType,liveDays,lockedDays]);

  const summary = useMemo(()=>
    displayDays.length>0 ? calcSummary(displayDays) : null
  ,[displayDays]);

  const closeDay = async(date:string)=>{
    if(!restaurantId) return;
    const liveDay = liveDays.find(d=>d.date===date);
    if(!liveDay) return;
    if(liveDay.hasClosedZ){
      alert('יום זה כבר נסגר בדוח Z. לא ניתן לסגור פעמיים.');
      return;
    }
    const diff = (new Date(todayStr()).getTime()-new Date(date).getTime())/86400000;
    if(diff>1){
      const ok = window.confirm(`⚠️ תאריך זה (${heDayFull(date)}) הוא לפני יותר מ-24 שעות.\nדוח Z חייב להיות מופק תוך 24 שעות.\nהאם להמשיך?`);
      if(!ok) return;
    }
    setClosingDay(date);
    try{
      await db.from('daily_reports').upsert({
        restaurant_id: restaurantId, date,
        report_type:  'Z',
        cash_amount:  liveDay.cash,
        card_amount:  liveDay.card,
        total_amount: liveDay.revenue,
        orders_count: liveDay.ordersCount,
        closed_at:    new Date().toISOString(),
      },{onConflict:'restaurant_id,date'});
      await fetchReport();
    } finally{ setClosingDay(null); }
  };

  const dateLabel = useMemo(()=>{
    const to = mode==='day'?dateFrom:dateTo;
    return dateFrom===to?heDayFull(dateFrom):`${heDayFull(dateFrom)} – ${heDayFull(to)}`;
  },[dateFrom,dateTo,mode]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto" dir="rtl">

      <PageHeader
        title="דוחות X/Z"
        description={`דוח X = פתוח | דוח Z = סגור • ${storeName} • ${dateLabel}`}
        isLive={true}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={()=>summary&&sendWhatsApp(summary,storeName,dateLabel,reportType)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
              <MessageCircle className="w-4 h-4"/> WhatsApp
            </button>
            <button onClick={()=>summary&&openFullReport(displayDays,summary,storeName,dateLabel,reportType)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
              <Eye className="w-4 h-4"/> צפייה מלאה
            </button>
            <button onClick={()=>summary&&printReport(displayDays,summary,storeName,dateLabel,reportType)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
              <Printer className="w-4 h-4"/> הדפס
            </button>
            <button onClick={()=>summary&&downloadCSV(displayDays,summary,storeName,dateLabel,reportType)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
              <Download className="w-4 h-4"/> CSV
            </button>
            <button onClick={fetchReport} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>
            </button>
          </div>
        }
      />

      {/* Controls */}
      <SectionCard title="הגדרות דוח" icon={Calendar} noPadding>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['X','Z'] as const).map(t=>(
              <button key={t} onClick={()=>setReportType(t)}
                className={`px-5 py-2 text-sm font-bold transition-colors ${reportType===t?(t==='X'?'bg-amber-500 text-white':'bg-red-600 text-white'):'bg-card text-muted-foreground hover:bg-muted'}`}>
                דוח {t}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['day','range'] as const).map(m=>(
              <button key={m} onClick={()=>setMode(m)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode===m?'bg-primary text-primary-foreground':'bg-card text-muted-foreground hover:bg-muted'}`}>
                {m==='day'?'יום':'טווח'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground"/>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"/>
            </div>
            {mode==='range'&&<>
              <span className="text-muted-foreground text-sm">עד</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground"/>
            </>}
          </div>
          <button onClick={fetchReport} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
            {loading?<RefreshCw className="w-4 h-4 animate-spin"/>:'הצג דוח'}
          </button>
        </div>
        {/* Source indicator */}
        <div className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${reportType==='X'?'bg-amber-50 dark:bg-amber-950/20 text-amber-700':'bg-red-50 dark:bg-red-950/20 text-red-700'}`}>
          {reportType==='X'
            ? <><Wifi className="w-3.5 h-3.5 shrink-0"/>דוח X — snapshot זמני של הקופה בזמן אמת, ללא איפוס. משתנה עם כל הזמנה חדשה.</>
            : <><Lock className="w-3.5 h-3.5 shrink-0"/>דוח Z — דוח סגירה סופי של כל היום, כולל כל העסקאות שנכנסו. נועל קופה. לא משתנה לאחר הסגירה.</>}
        </div>
      </div>
      </SectionCard>

      {/* Banner */}
      <ReportBanner reportType={reportType} summary={summary} liveDays={liveDays} lockedDays={lockedDays}/>

      {/* KPIs */}
      {summary&&(
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="הכנסות"      value={fmt(summary.totalRevenue)}
            sub={`${summary.totalOrders} הזמנות`} sub2={`ממוצע: ${fmt(summary.avgOrderValue)}`}
            icon={TrendingUp} accent="bg-emerald-500"/>
          <KpiCard label="עלות עובדים" value={fmt(summary.totalStaffCost)}
            sub={`${fmtPct(summary.staffRatio)} מההכנסות`}
            icon={TrendingDown} accent="bg-blue-500" barPct={summary.staffRatio} warn={summary.staffRatio>40}/>
          <KpiCard label="סה״כ הוצאות" value={fmt(summary.totalExpenses)}
            sub="קבועות + עובדים + שוטפות"
            icon={AlertTriangle} accent="bg-orange-500"/>
          <KpiCard label="רווח נקי"    value={fmt(summary.totalProfit)}
            sub={`מרווח: ${fmtPct(summary.weightedMargin)}`}
            icon={summary.totalProfit>=0?CheckCircle2:AlertTriangle}
            accent={summary.totalProfit>=0?'bg-violet-500':'bg-red-500'}/>
        </div>
      )}

      {/* Chart + panels */}
      {displayDays.length>0&&summary&&(
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><RevenueChart days={displayDays}/></div>
          <div className="space-y-4">
            <GoalBlock revenue={summary.totalRevenue} goal={goal} setGoal={setGoal}/>
            <InsightsPanel summary={summary} days={displayDays}/>
          </div>
        </div>
      )}

      {/* Per-day table */}
      {(reportType==='X'?liveDays:lockedDays).length>0&&(
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">פירוט יומי</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">
              {reportType==='X'?liveDays.length:lockedDays.filter(Boolean).length} ימים
            </span>
          </div>
          <div className="divide-y divide-border">
            {(reportType==='X'?liveDays:lockedDays).map((dayOrNull,idx)=>{
              const date = liveDays[idx]?.date ?? '';
              const liveDay = liveDays[idx];

              // Z mode with no snapshot for this date
              if(reportType==='Z'&&dayOrNull===null) {
                return (
                  <div key={date} className="px-5 py-4 flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <p className="text-sm font-bold text-foreground">{heDayFull(date)}</p>
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">לא נסגר</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">אין דוח Z סגור ליום זה</p>
                    </div>
                    {liveDay&&!liveDay.hasClosedZ&&liveDay.revenue>0&&(
                      <button onClick={()=>closeDay(date)} disabled={closingDay===date}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors">
                        {closingDay===date?<RefreshCw className="w-3 h-3 animate-spin"/>:<Lock className="w-3 h-3"/>}
                        סגור יום Z
                      </button>
                    )}
                  </div>
                );
              }

              const day = dayOrNull as LiveDay|LockedDay;
              return (
                <div key={date}>
                  <button onClick={()=>setExpandedDay(expandedDay===date?null:date)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-muted/40 transition-colors text-right">
                    <div className="w-32 shrink-0">
                      <p className="text-sm font-bold text-foreground">{heDayFull(day.date)}</p>
                      <p className="text-[10px] mt-0.5">
                        {reportType==='Z'
                          ? <span className="text-red-600 font-semibold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5 inline"/>Z נעול</span>
                          : (day as LiveDay).hasClosedZ
                            ? <span className="text-amber-600 font-semibold">X live (Z קיים)</span>
                            : <span className="text-amber-600 font-semibold">X live</span>}
                      </p>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-black text-foreground">{fmt(day.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{day.ordersCount} הזמנות</p>
                    </div>
                    <div className="flex-1 text-right hidden sm:block">
                      <p className={`text-sm font-black ${day.profit>=0?'text-emerald-600':'text-red-500'}`}>{fmt(day.profit)}</p>
                      <p className="text-xs text-muted-foreground">{fmtPct(day.margin)}</p>
                    </div>
                    <div className="shrink-0 w-16 text-center">
                      {day.revenue===0
                        ?<span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">אין נתון</span>
                        :day.profit>0&&day.margin>=30
                          ?<span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">רווחי ✓</span>
                          :day.profit>0
                            ?<span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">בריווח</span>
                            :<span className="text-[10px] px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">הפסד ⚠</span>}
                    </div>
                    {expandedDay===date?<ChevronUp className="w-4 h-4 text-muted-foreground shrink-0"/>:<ChevronDown className="w-4 h-4 text-muted-foreground shrink-0"/>}
                  </button>

                  {expandedDay===date&&(
                    <div className="px-5 pb-5 bg-muted/20 border-t border-border/50">
                      {/* Source tag */}
                      <div className={`mt-3 mb-3 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${
                        reportType==='Z'?'bg-red-50 dark:bg-red-950/30 text-red-700':'bg-amber-50 dark:bg-amber-950/30 text-amber-700'}`}>
                        {reportType==='Z'
                          ?<><Lock className="w-3 h-3 shrink-0"/>נתוני Z נעולים — סגירה ב-{new Date((day as LockedDay).closedAt).toLocaleString('he-IL',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'numeric'})}</>
                          :reportType==='X'&&(day as LiveDay).hasClosedZ
                            ?<><RefreshCw className="w-3 h-3 shrink-0"/>דוח X — נתונים live. יום זה גם קיים ב-Z נעול.</>
                            :<><RefreshCw className="w-3 h-3 shrink-0"/>דוח X — נתונים חיים. היום טרם נסגר.</>}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          {label:'מזומן',value:fmt(day.cash)},
                          {label:'כרטיס',value:fmt(day.card)},
                          {label:'עלות עובדים',value:fmt(day.staffCost),warn:day.revenue>0&&day.staffCost/day.revenue>0.4},
                          {label:'הוצאות שוטפות',value:fmt(day.dailyExpenses)},
                          {label:'הוצאות קבועות (יומי)',value:fmt(day.fixedExpenses)},
                          {label:'סה״כ הוצאות',value:fmt(day.totalExpenses)},
                        ].map(item=>(
                          <div key={item.label} className={`rounded-xl p-3 border ${item.warn?'border-orange-200 bg-orange-50 dark:bg-orange-950/30':'border-border bg-card'}`}>
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className={`text-sm font-black mt-1 ${item.warn?'text-orange-600':'text-foreground'}`}>{item.value}</p>
                            {item.warn&&<p className="text-[10px] text-orange-500 mt-0.5">⚠ גבוה מ-40%</p>}
                          </div>
                        ))}
                      </div>

                      {day.revenue>0&&(
                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-muted-foreground">מרווח רווח</span>
                            <span className={`font-black ${day.margin>=30?'text-emerald-600':day.margin>0?'text-blue-600':'text-red-500'}`}>{fmtPct(day.margin)}</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${day.margin>=30?'bg-emerald-500':day.margin>0?'bg-blue-500':'bg-red-500'}`}
                              style={{width:`${Math.max(0,Math.min(100,day.margin))}%`}}/>
                          </div>
                        </div>
                      )}

                      {/* Close day button — only in X mode for open days */}
                      {reportType==='X'&&!(day as LiveDay).hasClosedZ&&day.revenue>0&&(
                        <div className="mt-4 flex justify-end">
                          <button onClick={()=>closeDay(day.date)} disabled={closingDay===day.date}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60">
                            {closingDay===day.date?<RefreshCw className="w-4 h-4 animate-spin"/>:<Lock className="w-4 h-4"/>}
                            סגור יום (Z)
                          </button>
                        </div>
                      )}

                      {/* Locked indicator */}
                      {reportType==='Z'&&(
                        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4"/> קופה אופסה — דוח Z הופק רשמית. לא ניתן לשנות.
                        </div>
                      )}
                      {reportType==='X'&&(day as LiveDay).hasClosedZ&&(
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3 shrink-0"/> יום זה נסגר ב-Z. מוצגים נתוני X עדכניים (לא נתוני הסגירה).
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading&&displayDays.length===0&&(
        <EmptyState
          icon={FileText}
          title={reportType==='Z'?'אין דוחות Z סגורים לתקופה זו':'אין נתונים לתקופה זו'}
          description={reportType==='Z'?'כדי לסגור יום — עבור לדוח X ולחץ "סגור יום (Z)"':'בחר תאריך אחר'}
        />
      )}
      {loading&&<LoadingState />}
    </div>
  );
}

function GatedAdminReportXZ() {
  return <FeatureGate feature="reports"><AdminReportXZ /></FeatureGate>;
}
export default GatedAdminReportXZ;