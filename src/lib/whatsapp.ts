import type { CartItem, CustomerDetails } from '@/types/menu';
import type { Translations } from '@/i18n/locales/en';

const PHONE = '972526204159';

const PREP_LABELS: Record<string, string> = {
  now: 'התחילו להכין',
  '20min': 'מוכן בעוד 20 דקות',
  '30min': 'מוכן בעוד 30 דקות',
};

const ORDER_TYPE_HE: Record<string, string> = {
  pickup: 'איסוף עצמי',
  delivery: 'משלוח',
  'eat-in': 'ישיבה במקום',
};

export const generateWhatsAppLink = (
  items: CartItem[],
  customer: CustomerDetails,
  subtotal: number,
  deliveryFee: number,
  total: number,
  _t: Translations,
  prepTime?: string
): string => {
  // Always Hebrew labels for the restaurant
  const orderTypeLabel = ORDER_TYPE_HE[customer.orderType] || customer.orderType;

  const itemLines = items
    .map((item) => {
      const opts = item.selectedOptions
        .flatMap((o) => o.selectedChoices.map((c) => c.name_he || c.name))
        .join(', ');
      const optsStr = opts ? ` (${opts})` : '';
      const notesStr = item.notes ? ` [${item.notes}]` : '';
      const itemName = item.menuItem.name_he || item.menuItem.name;
      return `• ${item.quantity}x ${itemName}${optsStr}${notesStr} — ₪${item.lineTotal}`;
    })
    .join('\n');

  const lines = [
    `*🐼 הזמנה חדשה — פנדלינה*`,
    ``,
    `*שם מלא:* ${customer.name}`,
    `*טלפון:* ${customer.phone}`,
    `*סוג הזמנה:* ${orderTypeLabel}`,
  ];

  if (customer.orderType === 'delivery' && customer.address) {
    lines.push(`*כתובת:* ${customer.address}`);
  }

  if (prepTime && PREP_LABELS[prepTime]) {
    lines.push(`*זמן הכנה:* ${PREP_LABELS[prepTime]}`);
  }

  lines.push('', `*פריטים:*`, itemLines, '');
  lines.push(`*סכום ביניים:* ₪${subtotal}`);

  if (customer.orderType === 'delivery') {
    lines.push(`*דמי משלוח:* ₪${deliveryFee}`);
  }

  lines.push(`*סה״כ:* ₪${total}`);

  if (customer.notes) {
    lines.push('', `*הערות:* ${customer.notes}`);
  }

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${PHONE}?text=${text}`;
};
