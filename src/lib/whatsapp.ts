import type { CartItem, CustomerDetails } from '@/types/menu';

const PHONE = '972503009005';

export const generateWhatsAppLink = (
  items: CartItem[],
  customer: CustomerDetails,
  subtotal: number,
  deliveryFee: number,
  total: number
): string => {
  const orderTypeLabel = {
    pickup: 'Pickup',
    delivery: 'Delivery',
    'eat-in': 'Eat In',
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
    `*🐼 New Order — Pandalina*`,
    ``,
    `*Customer:* ${customer.name}`,
    `*Phone:* ${customer.phone}`,
    `*Order Type:* ${orderTypeLabel}`,
  ];

  if (customer.orderType === 'delivery' && customer.address) {
    lines.push(`*Address:* ${customer.address}`);
  }

  lines.push('', `*Items:*`, itemLines, '');
  lines.push(`*Subtotal:* ₪${subtotal}`);

  if (customer.orderType === 'delivery') {
    lines.push(`*Delivery Fee:* ₪${deliveryFee}`);
  }

  lines.push(`*Total:* ₪${total}`);

  if (customer.notes) {
    lines.push('', `*Notes:* ${customer.notes}`);
  }

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${PHONE}?text=${text}`;
};
