/**
 * Formatting helpers — money, dates, phone numbers, etc.
 */

export function formatINR(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91'))
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return phone;
}

export function truncate(text: string | undefined | null, max = 60): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}

export function formatOrderNumber(order: { orderId?: string | number; entityId?: number }): string {
  if (order.orderId) return `#${order.orderId}`;
  if (order.entityId) return `#${order.entityId}`;
  return '';
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Safely coerce any API response shape to an array.
 * The backend returns arrays under various keys depending on endpoint:
 *   `products`, `categories`, `galleryImages`, `banners`, `orders`,
 *   `addresses`, `items`, `content`, `results`, `data`.
 * If none of the known keys match, we pick the first array field on the object.
 */
export function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const knownKeys = [
      'data',
      'items',
      'content',
      'results',
      'products',
      'categories',
      'galleryImages',
      'banners',
      'orders',
      'addresses',
      'reviews',
    ];
    for (const key of knownKeys) {
      if (Array.isArray(v[key])) return v[key] as T[];
    }
    // Last resort: find any array field.
    for (const k of Object.keys(v)) {
      if (Array.isArray(v[k])) return v[k] as T[];
    }
  }
  return [];
}
