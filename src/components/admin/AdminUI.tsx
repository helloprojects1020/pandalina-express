/**
 * AdminUI — shared design-system components for the Bitelyx admin panel.
 *
 * Import what you need:
 *   import { KpiCard, PageHeader, SectionCard, StatusBadge, EmptyState, LoadingState, FilterPills } from '@/components/admin/AdminUI';
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  /** hex colour, e.g. '#10b981' */
  accent: string;
  /** optional % change vs previous period — positive = good */
  trend?: number;
  /** if provided the whole card is a link */
  href?: string;
  onClick?: () => void;
}

export interface SectionCardProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  isLive?: boolean;
  actions?: React.ReactNode;
}

export interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'payment' | 'stock';
  size?: 'sm' | 'md';
}

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export interface FilterPillsProps {
  options: { key: string; label: string; count?: number; highlight?: boolean }[];
  value: string;
  onChange: (key: string) => void;
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

export function KpiCard({ label, value, sub, icon: Icon, accent, trend, href, onClick }: KpiCardProps) {
  const inner = (
    <div
      className="group relative border border-border/50 rounded-2xl p-4 overflow-hidden hover:border-border hover:shadow-lg transition-all duration-200 cursor-default"
      style={{ background: `linear-gradient(135deg, ${accent}14 0%, ${accent}06 100%)` }}
      onClick={onClick}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 opacity-70"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}20` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: accent }} />
        </div>
        {href && (
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
            trend >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
          }`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-xl font-black text-foreground tracking-tight leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-snug">{label}</p>
      {sub && (
        <p className="text-[11px] font-semibold mt-1" style={{ color: accent }}>{sub}</p>
      )}
    </div>
  );

  if (href) {
    return <Link to={href} className="block">{inner}</Link>;
  }
  return inner;
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

export function SectionCard({ title, description, icon: Icon, action, children, className = '', noPadding }: SectionCardProps) {
  return (
    <div className={`bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between gap-3 ${noPadding ? 'px-5 pt-5' : 'px-5 py-4'} border-b border-border/40`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-sm leading-tight">{title}</h3>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {/* Body */}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({ title, description, isLive, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-black tracking-tight text-foreground">{title}</h1>
          {isLive !== undefined && (
            <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all ${
              isLive ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {isLive ? 'Live' : 'מתחבר...'}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; classes: string; dot: string }> = {
  new:       { label: 'חדשה',    classes: 'bg-blue-500/10 text-blue-700 border-blue-200',           dot: 'bg-blue-500' },
  preparing: { label: 'בהכנה',   classes: 'bg-amber-500/10 text-amber-700 border-amber-200',         dot: 'bg-amber-500' },
  ready:     { label: 'מוכנה',   classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',   dot: 'bg-emerald-500' },
  completed: { label: 'הושלמה', classes: 'bg-slate-500/10 text-slate-500 border-slate-200',          dot: 'bg-slate-400' },
  cancelled: { label: 'בוטלה',   classes: 'bg-red-500/10 text-red-700 border-red-200',              dot: 'bg-red-500' },
};

const PAYMENT_STATUS: Record<string, { label: string; classes: string }> = {
  paid:    { label: 'שולם',           classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  pending: { label: 'ממתין לתשלום',  classes: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  failed:  { label: 'תשלום נכשל',    classes: 'bg-red-500/10 text-red-700 border-red-200' },
};

const STOCK_STATUS: Record<string, { label: string; classes: string }> = {
  ok:      { label: 'תקין',      classes: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  low:     { label: 'מלאי נמוך', classes: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  empty:   { label: 'אזל',       classes: 'bg-red-500/10 text-red-700 border-red-200' },
};

export function StatusBadge({ status, type = 'order', size = 'sm' }: StatusBadgeProps) {
  const map = type === 'order' ? ORDER_STATUS : type === 'payment' ? PAYMENT_STATUS : STOCK_STATUS;
  const cfg = map[status];
  if (!cfg) return null;

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border leading-none ${pad} ${cfg.classes}`}>
      {type === 'order' && ORDER_STATUS[status]?.dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ORDER_STATUS[status].dot}`} />
      )}
      {cfg.label}
    </span>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}
      <p className="text-sm font-bold text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px] leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────

export function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-24 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">טוען...</p>
      </div>
    </div>
  );
}

// ─── FilterPills ──────────────────────────────────────────────────────────────

export function FilterPills({ options, value, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(({ key, label, count, highlight }) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border active:scale-95 ${
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : highlight
                ? 'bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/15'
                : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : highlight
                  ? 'bg-blue-500 text-white'
                  : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── ActionButton ─────────────────────────────────────────────────────────────

export function ActionButton({
  onClick, icon: Icon, label, variant = 'ghost', disabled,
}: {
  onClick?: () => void;
  icon?: React.ElementType;
  label?: string;
  variant?: 'ghost' | 'outline' | 'primary';
  disabled?: boolean;
}) {
  const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50';
  const styles = {
    ghost: 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground',
    outline: 'border border-border bg-card hover:bg-muted text-foreground',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  };
  return (
    <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}
