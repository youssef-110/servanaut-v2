// News aggregation: NewsAPI + The Guardian fetched in parallel, normalized,
// deduplicated, enriched with AI summaries/sentiment/relevance, and persisted.

import { withCache } from '../middleware/cache.js';
import { enrichArticles } from './openaiService.js';
import { upsertArticles, getProfile } from './supabaseService.js';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;
const NEWS_TTL_MS = 15 * 60 * 1000;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Source fetchers — each returns a normalized article shape:
// { title, source, url, published_at, content_snippet }
// ---------------------------------------------------------------------------

async function fetchNewsApi(query, from) {
  if (!NEWS_API_KEY) return [];
  const url =
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}` +
    `&from=${from}&sortBy=publishedAt&language=en&pageSize=30&apiKey=${NEWS_API_KEY}`;
  const data = await fetchJson(url);
  return (data.articles || []).map((a) => ({
    title: a.title || 'Untitled',
    source: a.source?.name || 'NewsAPI',
    url: a.url,
    published_at: a.publishedAt || null,
    content_snippet: a.description || a.content || '',
  }));
}

async function fetchGuardian(query, from) {
  if (!GUARDIAN_API_KEY) return [];
  const url =
    `https://content.guardianapis.com/search?q=${encodeURIComponent(query)}` +
    `&from-date=${from}&order-by=newest&page-size=25&show-fields=trailText` +
    `&api-key=${GUARDIAN_API_KEY}`;
  const data = await fetchJson(url);
  return (data.response?.results || []).map((r) => ({
    title: r.webTitle || 'Untitled',
    source: 'The Guardian',
    url: r.webUrl,
    published_at: r.webPublicationDate || null,
    content_snippet: (r.fields?.trailText || '').replace(/<[^>]*>/g, ''),
  }));
}

// Demo articles so the UI is never empty when no news keys are configured.
function demoArticles(topics) {
  const now = Date.now();
  const topic = topics[0] || 'AI';
  return [
    {
      title: `Configure NEWS_API_KEY and GUARDIAN_API_KEY to see live ${topic} news here`,
      source: 'SERVANAUT',
      url: 'https://newsapi.org/register',
      published_at: new Date(now - 3600 * 1000).toISOString(),
      content_snippet:
        'This is a placeholder shown because no news API keys are configured. Both NewsAPI and The Guardian offer free API keys — add them to backend/.env and restart the server to see a live, AI-summarized news feed for your tracked topics.',
    },
  ];
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function dedupe(articles) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const out = [];
  for (const a of articles) {
    if (!a.url || !a.title) continue;
    const titleKey = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seenUrls.has(a.url) || seenTitles.has(titleKey)) continue;
    seenUrls.add(a.url);
    seenTitles.add(titleKey);
    out.push(a);
  }
  return out;
}

/**
 * Fetch + enrich + persist news for a set of topics.
 * Cached 15 minutes; serves stale results if upstream APIs fail.
 * @returns {{ articles: Array, stale: boolean }}
 */
export async function getAggregatedNews(topics = [], { hours = 48 } = {}) {
  const profile = await getProfile();
  const effectiveTopics = topics.length ? topics : profile.topics_json || [];
  if (!effectiveTopics.length) effectiveTopics.push('technology startups');

  const query = effectiveTopics.slice(0, 5).map((t) => `"${t}"`).join(' OR ');
  const from = new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 10);
  const cacheKey = `news:${query}:${from}`;

  const { data, stale } = await withCache(cacheKey, NEWS_TTL_MS, async () => {
    const results = await Promise.allSettled([fetchNewsApi(query, from), fetchGuardian(query, from)]);
    let merged = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    if (results.every((r) => r.status === 'rejected')) {
      const reasons = results.map((r) => r.reason?.message).join('; ');
      throw new Error(`All news sources failed: ${reasons}`);
    }
    if (!merged.length && !NEWS_API_KEY && !GUARDIAN_API_KEY) {
      merged = demoArticles(effectiveTopics);
    }

    merged = dedupe(merged).sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    const top = merged.slice(0, 40);

    // Batch-enrich with AI (summary, sentiment, relevance).
    const enrichments = await enrichArticles(top);
    const enriched = top.map((a, i) => ({
      ...a,
      ai_summary: enrichments[i].summary,
      sentiment: enrichments[i].sentiment,
      relevance_score: enrichments[i].relevance_score,
    }));

    // Persist so read/saved state and briefings can reference these rows.
    return await upsertArticles(enriched);
  });

  return { articles: data, stale };
}

/** News mentioning a specific company (for competitor + funding intel). */
export async function getCompanyNews(companyName, extraKeywords = []) {
  const terms = [`"${companyName}"`, ...extraKeywords.map((k) => `"${k}"`)].join(' OR ');
  const from = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const cacheKey = `company-news:${companyName}`;

  const { data, stale } = await withCache(cacheKey, NEWS_TTL_MS, async () => {
    const results = await Promise.allSettled([fetchNewsApi(terms, from), fetchGuardian(companyName, from)]);
    const merged = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
    return dedupe(merged)
      .filter((a) => (a.title + ' ' + a.content_snippet).toLowerCase().includes(companyName.toLowerCase()))
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
      .slice(0, 15);
  });

  return { articles: data, stale };
}

/** Funding-specific news for a company (private-market signal). */
export async function getFundingNews(companyName) {
  const query = `"${companyName} raises" OR "${companyName} funding" OR "${companyName} Series"`;
  const from = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const cacheKey = `funding-news:${companyName}`;

  const { data, stale } = await withCache(cacheKey, 60 * 60 * 1000, async () => {
    const results = await Promise.allSettled([fetchNewsApi(query, from)]);
    const merged = results.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value);
    return dedupe(merged).slice(0, 5);
  });

  return { articles: data, stale };
}
