// Research & innovation tracking: ArXiv papers (public Atom API, parsed
// with fast-xml-parser) and GitHub trending repos (Search API — repos
// created in the last 7 days sorted by stars, since github.com/trending
// has no official API). Also competitor GitHub org activity + a simple
// careers-page hiring-signal scraper.

import { XMLParser } from 'fast-xml-parser';
import { withCache } from '../middleware/cache.js';
import { enrichPapers } from './openaiService.js';
import { upsertPapers, getProfile } from './supabaseService.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RESEARCH_TTL_MS = 60 * 60 * 1000;

const xmlParser = new XMLParser({ ignoreAttributes: false });

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'servanaut-v2',
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

// ---------------------------------------------------------------------------
// ArXiv
// ---------------------------------------------------------------------------

/**
 * Fetch latest ArXiv papers for keywords, enrich with AI summaries +
 * founder relevance, persist, and return stored rows.
 */
export async function getArxivPapers(keywords = [], { max = 12 } = {}) {
  const profile = await getProfile();
  const effective = keywords.length
    ? keywords
    : profile.research_keywords_json?.length
      ? profile.research_keywords_json
      : profile.topics_json || [];
  if (!effective.length) effective.push('machine learning');

  const query = effective
    .slice(0, 4)
    .map((k) => `all:"${k}"`)
    .join(' OR ');
  const cacheKey = `arxiv:${query}:${max}`;

  const { data, stale } = await withCache(cacheKey, RESEARCH_TTL_MS, async () => {
    const url =
      `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}` +
      `&sortBy=submittedDate&sortOrder=descending&max_results=${max}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`ArXiv HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml);

    let entries = parsed?.feed?.entry || [];
    if (!Array.isArray(entries)) entries = [entries];

    const papers = entries.map((e) => {
      const authors = Array.isArray(e.author) ? e.author : e.author ? [e.author] : [];
      return {
        title: String(e.title || '').replace(/\s+/g, ' ').trim(),
        authors_json: authors.map((a) => a.name).filter(Boolean).slice(0, 8),
        abstract: String(e.summary || '').replace(/\s+/g, ' ').trim(),
        arxiv_url: typeof e.id === 'string' ? e.id : '',
        published_at: e.published || null,
      };
    }).filter((p) => p.title && p.arxiv_url);

    const enrichments = await enrichPapers(papers);
    const enriched = papers.map((p, i) => ({
      ...p,
      ai_summary: enrichments[i].summary,
      relevance_score: enrichments[i].relevance_score,
    }));

    const stored = await upsertPapers(enriched);
    return stored.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
  });

  return { papers: data, stale };
}

// ---------------------------------------------------------------------------
// GitHub trending
// ---------------------------------------------------------------------------

/** Top repos created in the last week matching the founder's topics/language. */
export async function getTrendingRepos({ topics = [], language = '' } = {}) {
  const profile = await getProfile();
  const effectiveTopics = topics.length ? topics : profile.github_topics_json || [];
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const parts = [`created:>${since}`, 'stars:>10'];
  for (const t of effectiveTopics.slice(0, 3)) parts.push(`topic:${t.toLowerCase().replace(/\s+/g, '-')}`);
  if (language) parts.push(`language:${language}`);
  const q = parts.join(' ');
  const cacheKey = `gh-trending:${q}`;

  const { data, stale } = await withCache(cacheKey, RESEARCH_TTL_MS, async () => {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=10`;
    const res = await fetchWithTimeout(url, { headers: githubHeaders() });
    if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
    const body = await res.json();
    return (body.items || []).map((r) => ({
      name: r.full_name,
      url: r.html_url,
      description: r.description || '',
      stars: r.stargazers_count,
      language: r.language || '',
      topics: r.topics || [],
      created_at: r.created_at,
    }));
  });

  return { repos: data, stale };
}

/** Recent public activity for a competitor's GitHub org. */
export async function getOrgActivity(org) {
  if (!org) return { events: [], stale: false };
  const cacheKey = `gh-org:${org}`;
  try {
    const { data, stale } = await withCache(cacheKey, RESEARCH_TTL_MS, async () => {
      const res = await fetchWithTimeout(
        `https://api.github.com/orgs/${encodeURIComponent(org)}/events?per_page=20`,
        { headers: githubHeaders() }
      );
      if (!res.ok) throw new Error(`GitHub org HTTP ${res.status}`);
      const events = await res.json();
      return events.map((e) => ({
        type: e.type?.replace('Event', '') || 'Activity',
        repo: e.repo?.name || '',
        created_at: e.created_at,
      }));
    });
    return { events: data, stale };
  } catch {
    return { events: [], stale: false };
  }
}

// ---------------------------------------------------------------------------
// Careers-page hiring signal
// ---------------------------------------------------------------------------

const HIRING_KEYWORDS = [
  'hiring', 'careers', 'open roles', 'open positions', 'join our team', 'apply now',
  'senior engineer', 'staff engineer', 'software engineer', 'product manager',
  'head of', 'we’re hiring', "we're hiring", 'job openings',
];

/**
 * Naive hiring-signal scrape: fetch likely careers pages and count keyword
 * occurrences. A rising count over time indicates growth.
 */
export async function getJobsSignal(website) {
  if (!website) return { count: 0, checked_url: null };
  let base = website.trim();
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, '');

  const candidates = [`${base}/careers`, `${base}/jobs`, `${base}/join-us`, base];
  for (const url of candidates) {
    try {
      const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'servanaut-v2' } }, 8000);
      if (!res.ok) continue;
      const html = (await res.text()).toLowerCase();
      let count = 0;
      for (const kw of HIRING_KEYWORDS) {
        count += html.split(kw.toLowerCase()).length - 1;
      }
      if (count > 0 || url !== base) return { count, checked_url: url };
    } catch {
      // Try the next candidate URL.
    }
  }
  return { count: 0, checked_url: null };
}
