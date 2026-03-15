import type { CartItem, CustomerDetails } from '@/types/menu';
import type { Translations } from '@/i18n/locales/en';

const PHONE = '972526204159';

export const generateWhatsAppLink = (
  items: CartItem[],
  customer: CustomerDetails,
  subtotal: number,
  deliveryFee: number,
  total: number,
  t: Translations
): string => {
  const orderTypeLabel = {
    pickup: t.wa.pickup,
    delivery: t.wa.delivery,
    'eat-in': t.wa.eat_in,
  }[customer.orderType];

  const itemLines = items
    .map((item) => {
      const opts = item.selectedOptions
        .flatMap((o) => o.selectedChoices.map((c) => c.name))
        .join(', ');
      const optsStr = opts ? ` (${opts})` : '';
      const notesStr = item.notes ? ` [${item.notes}]` : '';
      return `• ${item.quantity}x ${item.menuItem.name}${optsStr}${notesStr} — ₪${item.lineTotal}`;
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
