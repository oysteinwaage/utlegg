const WEEKDAYS_NO = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];

export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const weekday = WEEKDAYS_NO[date.getDay()];
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${capitalized} ${dd}.${mm}.${yyyy}`;
}

export function formatShortDate(timestamp) {
  const date = new Date(timestamp);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatCurrency(amount, currencyCode) {
  if (amount == null) return '–';
  const rounded = Math.round(amount * 100) / 100;
  return `${rounded.toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currencyCode}`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
