// Market intelligence: Alpha Vantage quotes + 30-day series for public
// tickers, plus sentiment aggregation and hot-topic frequency computed
// from the cached news feed.

import { withCache } from '../middleware/cache.js';
import { getAggregatedNews } from './newsService.js';
import { getProfile } from './supabaseService.js';

const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY;
const MARKET_TTL_MS = 5 * 60 * 1000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
    const data = await res.json();
    if (data.Note || data.Information) {
      // Free tier rate limit hit — treat as failure so stale cache is served.
      throw new Error('Alpha Vantage rate limit reached');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Deterministic demo series so the UI works without a key.
function demoQuote(symbol) {
  let seed = [...symbol].reduce((s, c) => s + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const base = 40 + rand() * 400;
  const series = [];
  let price = base;
  for (let i = 29; i >= 0; i--) {
    price = Math.max(1, price * (1 + (rand() - 0.48) * 0.04));
    series.push({
      date: new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10),
      close: Number(price.toFixed(2)),
    });
  }
  const last = series[series.length - 1].close;
  const prev = series[series.length - 2].close;
  return {
    symbol,
    price: last,
    change: Number((last - prev).toFixed(2)),
    change_percent: Number((((last - prev) / prev) * 100).toFixed(2)),
    series,
    demo: true,
  };
}

/** Quote + 30-day daily close series for one symbol. */
export async function getQuote(symbol) {
  const upper = symbol.toUpperCase().trim();
  const { data, stale } = await withCache(`quote:${upper}`, MARKET_TTL_MS, async () => {
    if (!ALPHA_KEY) return demoQuote(upper);

    const [quoteData, seriesData] = await Promise.all([
      fetchJson(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${upper}&apikey=${ALPHA_KEY}`),
      fetchJson(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${upper}&outputsize=compact&apikey=${ALPHA_KEY}`),
    ]);

    const quote = quoteData['Global Quote'] || {};
    const rawSeries = seriesData['Time Series (Daily)'] || {};
    const series = Object.entries(rawSeries)
      .slice(0, 30)
      .map(([date, values]) => ({ date, close: Number(values['4. close']) }))
      .reverse();

    return {
      symbol: upper,
      price: Number(quote['05. price']) || series[series.length - 1]?.close || 0,
      change: Number(quote['09. change']) || 0,
      change_percent: Number(String(quote['10. change percent'] || '0').replace('%', '')) || 0,
      series,
      demo: false,
    };
  });
  return { quote: data, stale };
}

/** Quotes for many symbols; failures per-symbol never break the batch. */
export async function getQuotes(symbols) {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))];
  const results = await Promise.allSettled(unique.map((s) => getQuote(s)));
  const quotes = [];
  let anyStale = false;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      quotes.push(r.value.quote);
      anyStale = anyStale || r.value.stale;
    } else {
      quotes.push({ symbol: unique[i], error: r.reason?.message || 'fetch failed', series: [] });
    }
  });
  return { quotes, stale: anyStale };
}

/**
 * Aggregate sentiment across the founder's current news feed.
 * Returns a 0-100 score (50 = neutral) plus the raw distribution.
 */
export async function getMarketSentiment() {
  const { articles, stale } = await getAggregatedNews([]);
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const a of articles) counts[a.sentiment || 'neutral'] += 1;
  const total = articles.length || 1;
  const score = Math.round(((counts.positive - counts.negative) / total) * 50 + 50);
  return {
    sentiment: {
      score,
      label: score >= 60 ? 'Bullish' : score <= 40 ? 'Bearish' : 'Neutral',
      counts,
      total: articles.length,
    },
    stale,
  };
}

const STOP_WORDS = new Set(
  ('the a an and or but of for to in on at with from by as is are was were be been this that these those it its ' +
    'new says said will can could would has have had how what why when who more most over after before amid up ' +
    'out about into than then also just not no its their his her they we you i your our us am pm year years')
    .split(' ')
);

/** Keyword frequency across recent headlines — the "hot topics" cloud. */
export async function getHotTopics() {
  const { articles, stale } = await getAggregatedNews([]);
  const profile = await getProfile();
  const ignore = new Set([...(profile.topics_json || []).map((t) => t.toLowerCase())]);

  const freq = new Map();
  for (const a of articles) {
    const words = `${a.title}`.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) || [];
    for (const w of words) {
      if (STOP_WORDS.has(w) || ignore.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  const topics = [...freq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([term, count]) => ({ term, count }));

  return { topics, stale };
}
