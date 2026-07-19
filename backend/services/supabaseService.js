// All database operations, centralized. If Supabase credentials are not
// configured, every function transparently falls back to an in-process
// memory store so the app remains fully usable without a database
// (data simply does not survive a restart).

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase =
  SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

export const usingSupabase = Boolean(supabase);

if (!usingSupabase) {
  console.warn('[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory store.');
}

// ---------------------------------------------------------------------------
// In-memory fallback store
// ---------------------------------------------------------------------------

const memory = {
  founder_profile: [
    {
      id: crypto.randomUUID(),
      company_name: 'My Startup',
      description: 'Describe what your company does in Settings.',
      stage: 'Seed',
      industry: 'Technology',
      topics_json: ['AI', 'startups', 'venture capital'],
      research_keywords_json: ['large language models'],
      github_topics_json: ['ai'],
      tracked_tickers_json: [],
      digest_email: '',
      digest_frequency: 'daily',
      digest_time: '07:00',
      refresh_interval_minutes: 15,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  news_articles: [],
  daily_briefings: [],
  competitors: [],
  watchlist_items: [],
  alerts: [],
  research_papers: [],
  digest_history: [],
  saved_articles: [],
};

function throwIf(error) {
  if (error) throw new Error(`[db] ${error.message}`);
}

// ---------------------------------------------------------------------------
// Founder profile / settings
// ---------------------------------------------------------------------------

export async function getProfile() {
  if (!supabase) return memory.founder_profile[0];
  const { data, error } = await supabase
    .from('founder_profile')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  throwIf(error);
  if (data) return data;
  // No row yet — create the default one.
  const { data: created, error: insertErr } = await supabase
    .from('founder_profile')
    .insert({ company_name: 'My Startup' })
    .select()
    .single();
  throwIf(insertErr);
  return created;
}

export async function updateProfile(patch) {
  const current = await getProfile();
  if (!supabase) {
    Object.assign(current, patch, { updated_at: new Date().toISOString() });
    return current;
  }
  const { data, error } = await supabase
    .from('founder_profile')
    .update(patch)
    .eq('id', current.id)
    .select()
    .single();
  throwIf(error);
  return data;
}

// ---------------------------------------------------------------------------
// News articles
// ---------------------------------------------------------------------------

/** Upsert articles by URL; returns stored rows (with ids and read/saved flags). */
export async function upsertArticles(articles) {
  if (!articles.length) return [];
  if (!supabase) {
    const stored = [];
    for (const a of articles) {
      let row = memory.news_articles.find((r) => r.url === a.url);
      if (row) {
        Object.assign(row, {
          ai_summary: a.ai_summary || row.ai_summary,
          sentiment: a.sentiment || row.sentiment,
          relevance_score: a.relevance_score ?? row.relevance_score,
        });
      } else {
        row = {
          id: crypto.randomUUID(),
          is_read: false,
          is_saved: false,
          created_at: new Date().toISOString(),
          ...a,
        };
        memory.news_articles.push(row);
      }
      stored.push(row);
    }
    return stored;
  }
  const { data, error } = await supabase
    .from('news_articles')
    .upsert(
      articles.map((a) => ({
        title: a.title,
        source: a.source,
        url: a.url,
        published_at: a.published_at,
        content_snippet: a.content_snippet,
        sentiment: a.sentiment,
        relevance_score: a.relevance_score,
        ai_summary: a.ai_summary,
      })),
      { onConflict: 'url', ignoreDuplicates: false }
    )
    .select();
  throwIf(error);
  return data;
}

export async function getArticleById(id) {
  if (!supabase) return memory.news_articles.find((a) => a.id === id) || null;
  const { data, error } = await supabase.from('news_articles').select('*').eq('id', id).maybeSingle();
  throwIf(error);
  return data;
}

export async function setArticleRead(id, isRead = true) {
  if (!supabase) {
    const a = memory.news_articles.find((r) => r.id === id);
    if (a) a.is_read = isRead;
    return a || null;
  }
  const { data, error } = await supabase
    .from('news_articles')
    .update({ is_read: isRead })
    .eq('id', id)
    .select()
    .maybeSingle();
  throwIf(error);
  return data;
}

export async function setArticleSaved(id, isSaved) {
  if (!supabase) {
    const a = memory.news_articles.find((r) => r.id === id);
    if (a) a.is_saved = isSaved;
    if (isSaved && a && !memory.saved_articles.find((s) => s.article_id === id)) {
      memory.saved_articles.push({ id: crypto.randomUUID(), article_id: id, saved_at: new Date().toISOString() });
    }
    if (!isSaved) {
      memory.saved_articles = memory.saved_articles.filter((s) => s.article_id !== id);
    }
    return a || null;
  }
  const { data, error } = await supabase
    .from('news_articles')
    .update({ is_saved: isSaved })
    .eq('id', id)
    .select()
    .maybeSingle();
  throwIf(error);
  if (isSaved) {
    await supabase.from('saved_articles').upsert({ article_id: id }, { onConflict: 'article_id' });
  } else {
    await supabase.from('saved_articles').delete().eq('article_id', id);
  }
  return data;
}

export async function getSavedArticles() {
  if (!supabase) return memory.news_articles.filter((a) => a.is_saved);
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('is_saved', true)
    .order('published_at', { ascending: false });
  throwIf(error);
  return data;
}

/** Articles published in the last `hours`, newest first. */
export async function getRecentArticles(hours = 24, limit = 50) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  if (!supabase) {
    return memory.news_articles
      .filter((a) => a.published_at && a.published_at >= since)
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
      .slice(0, limit);
  }
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(limit);
  throwIf(error);
  return data;
}

// ---------------------------------------------------------------------------
// Daily briefings
// ---------------------------------------------------------------------------

export async function getBriefingForDate(date) {
  if (!supabase) return memory.daily_briefings.find((b) => b.date === date) || null;
  const { data, error } = await supabase
    .from('daily_briefings')
    .select('*')
    .eq('date', date)
    .maybeSingle();
  throwIf(error);
  return data;
}

export async function saveBriefing(date, contentJson) {
  if (!supabase) {
    memory.daily_briefings = memory.daily_briefings.filter((b) => b.date !== date);
    const row = {
      id: crypto.randomUUID(),
      date,
      content_json: contentJson,
      generated_at: new Date().toISOString(),
    };
    memory.daily_briefings.push(row);
    return row;
  }
  const { data, error } = await supabase
    .from('daily_briefings')
    .upsert({ date, content_json: contentJson, generated_at: new Date().toISOString() }, { onConflict: 'date' })
    .select()
    .single();
  throwIf(error);
  return data;
}

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------

export async function listCompetitors() {
  if (!supabase) return [...memory.competitors];
  const { data, error } = await supabase.from('competitors').select('*').order('created_at');
  throwIf(error);
  return data;
}

export async function getCompetitor(id) {
  if (!supabase) return memory.competitors.find((c) => c.id === id) || null;
  const { data, error } = await supabase.from('competitors').select('*').eq('id', id).maybeSingle();
  throwIf(error);
  return data;
}

export async function addCompetitor(fields) {
  const row = {
    name: fields.name,
    website: fields.website || '',
    github_org: fields.github_org || '',
    ticker: fields.ticker || '',
    keywords_json: fields.keywords_json || [],
    threat_level: 'low',
    last_intel_summary: '',
    jobs_signal_count: 0,
    last_updated: new Date().toISOString(),
  };
  if (!supabase) {
    const created = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row };
    memory.competitors.push(created);
    return created;
  }
  const { data, error } = await supabase.from('competitors').insert(row).select().single();
  throwIf(error);
  return data;
}

export async function updateCompetitor(id, patch) {
  if (!supabase) {
    const c = memory.competitors.find((r) => r.id === id);
    if (c) Object.assign(c, patch, { last_updated: new Date().toISOString() });
    return c || null;
  }
  const { data, error } = await supabase
    .from('competitors')
    .update({ ...patch, last_updated: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();
  throwIf(error);
  return data;
}

export async function deleteCompetitor(id) {
  if (!supabase) {
    memory.competitors = memory.competitors.filter((c) => c.id !== id);
    return true;
  }
  const { error } = await supabase.from('competitors').delete().eq('id', id);
  throwIf(error);
  return true;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

export async function listWatchlist() {
  if (!supabase) return [...memory.watchlist_items];
  const { data, error } = await supabase.from('watchlist_items').select('*').order('created_at');
  throwIf(error);
  return data;
}

export async function addWatchlistItem(fields) {
  const row = {
    label: fields.label,
    keywords_json: fields.keywords_json || [fields.label],
    priority: fields.priority || 'medium',
    hit_count_week: 0,
    last_hit_at: null,
  };
  if (!supabase) {
    const created = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row };
    memory.watchlist_items.push(created);
    return created;
  }
  const { data, error } = await supabase.from('watchlist_items').insert(row).select().single();
  throwIf(error);
  return data;
}

export async function updateWatchlistItem(id, patch) {
  if (!supabase) {
    const item = memory.watchlist_items.find((w) => w.id === id);
    if (item) Object.assign(item, patch);
    return item || null;
  }
  const { data, error } = await supabase
    .from('watchlist_items')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  throwIf(error);
  return data;
}

export async function deleteWatchlistItem(id) {
  if (!supabase) {
    memory.watchlist_items = memory.watchlist_items.filter((w) => w.id !== id);
    return true;
  }
  const { error } = await supabase.from('watchlist_items').delete().eq('id', id);
  throwIf(error);
  return true;
}

export async function recordWatchlistHit(id) {
  const items = await listWatchlist();
  const item = items.find((w) => w.id === id);
  if (!item) return null;
  return updateWatchlistItem(id, {
    hit_count_week: (item.hit_count_week || 0) + 1,
    last_hit_at: new Date().toISOString(),
  });
}

export async function resetWeeklyHitCounts() {
  const items = await listWatchlist();
  for (const item of items) {
    await updateWatchlistItem(item.id, { hit_count_week: 0 });
  }
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function listAlerts({ type, unreadOnly, limit = 100 } = {}) {
  if (!supabase) {
    let rows = [...memory.alerts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (type) rows = rows.filter((a) => a.type === type);
    if (unreadOnly) rows = rows.filter((a) => !a.is_read);
    return rows.slice(0, limit);
  }
  let query = supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(limit);
  if (type) query = query.eq('type', type);
  if (unreadOnly) query = query.eq('is_read', false);
  const { data, error } = await query;
  throwIf(error);
  return data;
}

export async function createAlert({ type, title, content = '', source = '', source_url = '' }) {
  // Deduplicate: skip if an alert with the same title exists in the last 24h.
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const recent = await listAlerts({ limit: 200 });
  if (recent.some((a) => a.title === title && a.created_at >= dayAgo)) return null;

  const row = { type, title, content, source, source_url, is_read: false };
  if (!supabase) {
    const created = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row };
    memory.alerts.unshift(created);
    return created;
  }
  const { data, error } = await supabase.from('alerts').insert(row).select().single();
  throwIf(error);
  return data;
}

export async function getAlert(id) {
  if (!supabase) return memory.alerts.find((a) => a.id === id) || null;
  const { data, error } = await supabase.from('alerts').select('*').eq('id', id).maybeSingle();
  throwIf(error);
  return data;
}

export async function setAlertRead(id, isRead = true) {
  if (!supabase) {
    const a = memory.alerts.find((r) => r.id === id);
    if (a) a.is_read = isRead;
    return a || null;
  }
  const { data, error } = await supabase
    .from('alerts')
    .update({ is_read: isRead })
    .eq('id', id)
    .select()
    .maybeSingle();
  throwIf(error);
  return data;
}

export async function markAllAlertsRead() {
  if (!supabase) {
    memory.alerts.forEach((a) => (a.is_read = true));
    return true;
  }
  const { error } = await supabase.from('alerts').update({ is_read: true }).eq('is_read', false);
  throwIf(error);
  return true;
}

export async function unreadAlertCount() {
  if (!supabase) return memory.alerts.filter((a) => !a.is_read).length;
  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  throwIf(error);
  return count || 0;
}

// ---------------------------------------------------------------------------
// Research papers
// ---------------------------------------------------------------------------

export async function upsertPapers(papers) {
  if (!papers.length) return [];
  if (!supabase) {
    const stored = [];
    for (const p of papers) {
      let row = memory.research_papers.find((r) => r.arxiv_url === p.arxiv_url);
      if (row) {
        Object.assign(row, {
          ai_summary: p.ai_summary || row.ai_summary,
          relevance_score: p.relevance_score ?? row.relevance_score,
        });
      } else {
        row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...p };
        memory.research_papers.push(row);
      }
      stored.push(row);
    }
    return stored;
  }
  const { data, error } = await supabase
    .from('research_papers')
    .upsert(
      papers.map((p) => ({
        title: p.title,
        authors_json: p.authors_json,
        abstract: p.abstract,
        arxiv_url: p.arxiv_url,
        published_at: p.published_at,
        ai_summary: p.ai_summary,
        relevance_score: p.relevance_score,
      })),
      { onConflict: 'arxiv_url' }
    )
    .select();
  throwIf(error);
  return data;
}

export async function getRecentPapers(limit = 10) {
  if (!supabase) {
    return [...memory.research_papers]
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
      .slice(0, limit);
  }
  const { data, error } = await supabase
    .from('research_papers')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(limit);
  throwIf(error);
  return data;
}

// ---------------------------------------------------------------------------
// Digest history
// ---------------------------------------------------------------------------

export async function saveDigest({ subject, recipient_email, content_html }) {
  const row = { subject, recipient_email, content_html, sent_at: new Date().toISOString() };
  if (!supabase) {
    const created = { id: crypto.randomUUID(), ...row };
    memory.digest_history.unshift(created);
    return created;
  }
  const { data, error } = await supabase.from('digest_history').insert(row).select().single();
  throwIf(error);
  return data;
}

export async function getDigestHistory(limit = 20) {
  if (!supabase) return memory.digest_history.slice(0, limit);
  const { data, error } = await supabase
    .from('digest_history')
    .select('id, subject, recipient_email, sent_at')
    .order('sent_at', { ascending: false })
    .limit(limit);
  throwIf(error);
  return data;
}
