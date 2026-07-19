import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// API client — all backend calls go through here. Unwraps the
// { success, data, stale? } envelope and throws on { success: false }.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Server returned ${res.status} with no JSON body`);
  }
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }
  return { ...body.data, stale: body.stale || false };
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function timeAgo(dateInput) {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
}

export function formatPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Semantic color helpers (status colors always paired with text/icons)
// ---------------------------------------------------------------------------

export const sentimentStyles = {
  positive: 'bg-positive/15 text-positive border-positive/30',
  neutral: 'bg-surface-2 text-ink-secondary border-edge',
  negative: 'bg-negative/15 text-negative border-negative/30',
};

export const priorityStyles = {
  high: 'bg-negative/15 text-negative border-negative/30',
  medium: 'bg-caution/15 text-caution border-caution/30',
  low: 'bg-surface-2 text-ink-secondary border-edge',
};

export const threatStyles = {
  high: 'bg-negative/15 text-negative border-negative/30',
  medium: 'bg-caution/15 text-caution border-caution/30',
  low: 'bg-positive/15 text-positive border-positive/30',
};

export const alertTypeLabels = {
  news_spike: 'News Spike',
  competitor: 'Competitor',
  watchlist: 'Watchlist',
  research: 'Research',
  system: 'System',
};

/** Parse "a, b, c" into a trimmed, de-duplicated array. */
export function parseCsv(value) {
  return [...new Set(String(value || '').split(',').map((s) => s.trim()).filter(Boolean))];
}
