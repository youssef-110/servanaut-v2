-- ============================================================
-- SERVANAUT V2 — Supabase (Postgres) Schema
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Founder profile: business context used in every AI prompt,
-- plus digest + refresh preferences.
-- ------------------------------------------------------------
create table if not exists founder_profile (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'My Startup',
  description text not null default '',
  stage text not null default 'Seed',
  industry text not null default '',
  topics_json jsonb not null default '[]'::jsonb,
  research_keywords_json jsonb not null default '[]'::jsonb,
  github_topics_json jsonb not null default '[]'::jsonb,
  tracked_tickers_json jsonb not null default '[]'::jsonb,
  digest_email text,
  digest_frequency text not null default 'daily' check (digest_frequency in ('daily', 'weekly', 'off')),
  digest_time text not null default '07:00',
  refresh_interval_minutes integer not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Aggregated news articles (NewsAPI + The Guardian), enriched
-- with AI summary, sentiment and relevance.
-- ------------------------------------------------------------
create table if not exists news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null default '',
  url text not null unique,
  published_at timestamptz,
  content_snippet text default '',
  sentiment text default 'neutral' check (sentiment in ('positive', 'neutral', 'negative')),
  relevance_score numeric(4,1) default 5.0,
  ai_summary text default '',
  is_read boolean not null default false,
  is_saved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_news_published_at on news_articles (published_at desc);
create index if not exists idx_news_is_saved on news_articles (is_saved) where is_saved = true;

-- ------------------------------------------------------------
-- One AI-generated briefing per day. content_json holds:
-- { market_pulse, competitor_moves, research_highlights,
--   opportunities, risks, tldr }
-- ------------------------------------------------------------
create table if not exists daily_briefings (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  content_json jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists idx_briefings_date on daily_briefings (date desc);

-- ------------------------------------------------------------
-- Competitors the founder tracks. keywords_json is a list of
-- extra match terms besides the name; threat_level is
-- AI-assessed on intel refresh.
-- ------------------------------------------------------------
create table if not exists competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text default '',
  github_org text default '',
  ticker text default '',
  keywords_json jsonb not null default '[]'::jsonb,
  threat_level text not null default 'low' check (threat_level in ('low', 'medium', 'high')),
  last_intel_summary text default '',
  jobs_signal_count integer not null default 0,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Watchlist: arbitrary keywords / companies / people / topics.
-- ------------------------------------------------------------
create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  keywords_json jsonb not null default '[]'::jsonb,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  hit_count_week integer not null default 0,
  last_hit_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Unified alerts from every source.
-- type: news_spike | competitor | watchlist | research | system
-- ------------------------------------------------------------
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'system' check (type in ('news_spike', 'competitor', 'watchlist', 'research', 'system')),
  title text not null,
  content text default '',
  source text default '',
  source_url text default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_alerts_created_at on alerts (created_at desc);
create index if not exists idx_alerts_unread on alerts (is_read) where is_read = false;

-- ------------------------------------------------------------
-- ArXiv research papers enriched with AI summary + founder
-- relevance score (1–10).
-- ------------------------------------------------------------
create table if not exists research_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors_json jsonb not null default '[]'::jsonb,
  abstract text default '',
  arxiv_url text not null unique,
  published_at timestamptz,
  ai_summary text default '',
  relevance_score numeric(4,1) default 5.0,
  created_at timestamptz not null default now()
);

create index if not exists idx_papers_published_at on research_papers (published_at desc);

-- ------------------------------------------------------------
-- Sent email digests, for the history view in Settings.
-- ------------------------------------------------------------
create table if not exists digest_history (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  recipient_email text not null,
  content_html text not null default '',
  sent_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Saved-articles join table (articles also carry is_saved for
-- fast filtering; this table preserves save timestamps).
-- ------------------------------------------------------------
create table if not exists saved_articles (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references news_articles (id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (article_id)
);

-- ------------------------------------------------------------
-- updated_at trigger for founder_profile
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_founder_profile_updated on founder_profile;
create trigger trg_founder_profile_updated
  before update on founder_profile
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security: this is a single-founder tool accessed
-- exclusively through the backend using the service-role key,
-- so RLS is enabled with no anon policies (deny-by-default).
-- ------------------------------------------------------------
alter table founder_profile enable row level security;
alter table news_articles enable row level security;
alter table daily_briefings enable row level security;
alter table competitors enable row level security;
alter table watchlist_items enable row level security;
alter table alerts enable row level security;
alter table research_papers enable row level security;
alter table digest_history enable row level security;
alter table saved_articles enable row level security;

-- ------------------------------------------------------------
-- Seed a default profile row so the app works immediately.
-- ------------------------------------------------------------
insert into founder_profile (company_name, description, stage, industry, topics_json)
select 'My Startup', 'Describe what your company does in Settings.', 'Seed', 'Technology',
       '["AI", "startups", "venture capital"]'::jsonb
where not exists (select 1 from founder_profile);
