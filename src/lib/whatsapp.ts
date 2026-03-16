import type { CartItem, CustomerDetails } from '@/types/menu';
import type { Translations } from '@/i18n/locales/en';

const PHONE = '972526204159';

const PREP_LABELS: Record<string, string> = {
  now: 'התחילו להכין',
  '20min': 'מוכן בעוד 20 דקות',
  '30min': 'מוכן בעוד 30 דקות',
};

export const generateWhatsAppLink = (
  items: CartItem[],
  customer: CustomerDetails,
  subtotal: number,
  deliveryFee: number,
  total: number,
  t: Translations,
  prepTime?: string
): string => {
  const orderTypeLabel = {
    pickup: t.wa.pickup,
    delivery: t.wa.delivery,
    'eat-in': t.wa.eat_in,
  }[customer.orderType];

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
    `*${t.wa.new_order}*`,
    ``,
    `*${t.wa.customer}:* ${customer.name}`,
    `*${t.wa.phone}:* ${customer.phone}`,
    `*${t.wa.order_type}:* ${orderTypeLabel}`,
  ];

  if (customer.orderType === 'delivery' && customer.address) {
    lines.push(`*${t.wa.address}:* ${customer.address}`);
  }

  if (prepTime && PREP_LABELS[prepTime]) {
    lines.push(`*זמן הכנה:* ${PREP_LABELS[prepTime]}`);
  }

  lines.push('', `*${t.wa.items}:*`, itemLines, '');
  lines.push(`*${t.wa.subtotal}:* ₪${subtotal}`);

  if (customer.orderType === 'delivery') {
    lines.push(`*${t.wa.delivery_fee}:* ₪${deliveryFee}`);
  }

  lines.push(`*${t.wa.total}:* ₪${total}`);

  if (customer.notes) {
    lines.push('', `*${t.wa.notes}:* ${customer.notes}`);
  }

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${PHONE}?text=${text}`;
};
