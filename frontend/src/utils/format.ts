export const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

export function deliveryDate(days = 4) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'ig'), '<mark>$1</mark>');
}
