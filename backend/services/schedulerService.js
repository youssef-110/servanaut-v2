// Background jobs (node-cron) + shared orchestration used by both the cron
// jobs and the API routes:
//   - refresh news every 15 minutes (also scans the watchlist + fires alerts)
//   - generate the daily briefing at 07:00
//   - send the email digest at the configured time (checked every 15 min)
//   - weekly watchlist hit-count reset + cache sweep

import cron from 'node-cron';
import { cache } from '../middleware/cache.js';
import { getAggregatedNews } from './newsService.js';
import { getArxivPapers } from './researchService.js';
import { generateBriefing } from './openaiService.js';
import {
  getProfile,
  getRecentArticles,
  getBriefingForDate,
  saveBriefing,
  listCompetitors,
  listWatchlist,
  recordWatchlistHit,
  createAlert,
  getRecentPapers,
  resetWeeklyHitCounts,
} from './supabaseService.js';
import { sendDigest } from './emailService.js';

// ---------------------------------------------------------------------------
// Watchlist scanning — matches new articles/papers against watch keywords
// ---------------------------------------------------------------------------

export async function scanWatchlist({ articles = [], papers = [] } = {}) {
  const items = await listWatchlist();
  if (!items.length) return 0;
  let hits = 0;

  for (const item of items) {
    const keywords = (item.keywords_json?.length ? item.keywords_json : [item.label])
      .map((k) => String(k).toLowerCase())
      .filter(Boolean);

    for (const article of articles) {
      const haystack = `${article.title} ${article.content_snippet || ''}`.toLowerCase();
      const matched = keywords.find((k) => haystack.includes(k));
      if (matched) {
        const alert = await createAlert({
          type: 'watchlist',
          title: `Watchlist hit: "${item.label}" — ${article.title}`,
          content: article.ai_summary || article.content_snippet || '',
          source: article.source,
          source_url: article.url,
        });
        if (alert) {
          await recordWatchlistHit(item.id);
          hits += 1;
        }
      }
    }

    for (const paper of papers) {
      const haystack = `${paper.title} ${paper.abstract || ''}`.toLowerCase();
      const matched = keywords.find((k) => haystack.includes(k));
      if (matched) {
        const alert = await createAlert({
          type: 'research',
          title: `Research match: "${item.label}" — ${paper.title}`,
          content: paper.ai_summary || '',
          source: 'ArXiv',
          source_url: paper.arxiv_url,
        });
        if (alert) {
          await recordWatchlistHit(item.id);
          hits += 1;
        }
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// News-spike detection — many stories on one topic in a short window
// ---------------------------------------------------------------------------

async function detectNewsSpikes(articles) {
  const profile = await getProfile();
  for (const topic of profile.topics_json || []) {
    const lower = topic.toLowerCase();
    const matches = articles.filter((a) =>
      `${a.title} ${a.content_snippet || ''}`.toLowerCase().includes(lower)
    );
    if (matches.length >= 8) {
      await createAlert({
        type: 'news_spike',
        title: `News spike: ${matches.length} stories about "${topic}" right now`,
        content: matches.slice(0, 3).map((m) => m.title).join(' • '),
        source: 'News aggregator',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Daily briefing orchestration (used by cron and the /api/briefing route)
// ---------------------------------------------------------------------------

export async function buildDailyBriefing({ force = false } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  if (!force) {
    const existing = await getBriefingForDate(today);
    if (existing) return existing;
  }

  // Ensure the news/paper caches are warm, then assemble context from the DB.
  await Promise.allSettled([getAggregatedNews([]), getArxivPapers([])]);
  const [articles, competitors, papers] = await Promise.all([
    getRecentArticles(24, 25),
    listCompetitors(),
    getRecentPapers(8),
  ]);

  const content = await generateBriefing({ articles, competitors, papers });
  return saveBriefing(today, content);
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export async function refreshNewsJob() {
  try {
    const { articles } = await getAggregatedNews([]);
    await scanWatchlist({ articles });
    await detectNewsSpikes(articles);
    console.log(`[scheduler] news refreshed — ${articles.length} articles`);
  } catch (err) {
    console.warn('[scheduler] news refresh failed:', err.message);
  }
}

async function digestJob() {
  try {
    const profile = await getProfile();
    if (!profile.digest_email || profile.digest_frequency === 'off') return;

    const now = new Date();
    const [hh, mm] = String(profile.digest_time || '07:00').split(':').map(Number);
    // Fire within the 15-minute window containing the configured time.
    const configured = hh * 60 + (mm || 0);
    const current = now.getHours() * 60 + now.getMinutes();
    if (current < configured || current >= configured + 15) return;
    if (profile.digest_frequency === 'weekly' && now.getDay() !== 1) return; // Mondays

    await sendDigest({});
    console.log('[scheduler] digest sent to', profile.digest_email);
  } catch (err) {
    console.warn('[scheduler] digest job failed:', err.message);
  }
}

export function startScheduler() {
  // News refresh + watchlist scan, every 15 minutes.
  cron.schedule('*/15 * * * *', refreshNewsJob);

  // Daily briefing at 07:00 server time.
  cron.schedule('0 7 * * *', async () => {
    try {
      await buildDailyBriefing({ force: true });
      console.log('[scheduler] daily briefing generated');
    } catch (err) {
      console.warn('[scheduler] briefing job failed:', err.message);
    }
  });

  // Digest window check every 15 minutes.
  cron.schedule('*/15 * * * *', digestJob);

  // Research refresh + watchlist paper scan, hourly.
  cron.schedule('0 * * * *', async () => {
    try {
      const { papers } = await getArxivPapers([]);
      await scanWatchlist({ papers });
      console.log(`[scheduler] research refreshed — ${papers.length} papers`);
    } catch (err) {
      console.warn('[scheduler] research refresh failed:', err.message);
    }
  });

  // Weekly watchlist counter reset (Mondays 00:00) + cache sweep hourly.
  cron.schedule('0 0 * * 1', () => resetWeeklyHitCounts().catch(() => {}));
  cron.schedule('30 * * * *', () => cache.sweep());

  console.log('[scheduler] cron jobs registered');
}
