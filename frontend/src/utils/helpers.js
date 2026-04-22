export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
}

export function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function isOverdue(iso, thresholdDays = 14) {
  if (!iso) return false;
  return (Date.now() - new Date(iso).getTime()) > thresholdDays * 86400000;
}

export const CATEGORIES = [
  { id: 'food', label: 'Food & Drink', emoji: '🍕' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'accommodation', label: 'Accommodation', emoji: '🏠' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎉' },
  { id: 'utilities', label: 'Utilities', emoji: '💡' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'health', label: 'Health', emoji: '🏥' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'badminton', label: 'Badminton', emoji: '🏸' },
  { id: 'pickleball', label: 'Pickleball', emoji: '🥒' },
  { id: 'cricket', label: 'Cricket', emoji: '🏏' },
  { id: 'other_sport', label: 'Other Sport', emoji: '⚽' },
  { id: 'other', label: 'Other', emoji: '🔖' },
];

export function getCategoryEmoji(id) {
  return CATEGORIES.find(c => c.id === id)?.emoji || '🔖';
}

export function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
