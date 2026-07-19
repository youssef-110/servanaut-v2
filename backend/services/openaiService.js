// Every OpenAI call in the app goes through this module. All prompts embed
// the founder's business context so insights are framed for their startup.
// When OPENAI_API_KEY is absent, each function returns a sensible heuristic
// fallback so the product still works end-to-end.

import OpenAI from 'openai';
import { getProfile } from './supabaseService.js';

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;
const MODEL = 'gpt-4o';

export const usingOpenAI = Boolean(client);

if (!client) {
  console.warn('[openai] OPENAI_API_KEY not set — AI features use heuristic fallbacks.');
}

// ---------------------------------------------------------------------------
// System prompt built from the founder profile
// ---------------------------------------------------------------------------

export async function buildSystemPrompt() {
  const profile = await getProfile();
  const topics = (profile.topics_json || []).join(', ') || 'technology startups';
  return (
    `You are an AI intelligence analyst for ${profile.company_name}, a ${profile.stage} startup ` +
    `in the ${profile.industry || 'technology'} space.\n` +
    `Their focus: ${profile.description || 'early-stage technology'}.\n` +
    `They care about these topics: ${topics}.\n` +
    `Always frame insights from the perspective of how they impact this specific founder's business.\n` +
    `Be concise, direct, and actionable. Avoid filler words.`
  );
}

/** JSON-mode chat completion with robust parsing. */
async function jsonChat(systemPrompt, userPrompt, { maxTokens = 2000, temperature = 0.4 } = {}) {
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });
  return JSON.parse(response.choices[0].message.content);
}

// ---------------------------------------------------------------------------
// Heuristic fallbacks (used when there is no API key or a call fails)
// ---------------------------------------------------------------------------

const POSITIVE_WORDS = ['raises', 'funding', 'growth', 'launch', 'breakthrough', 'record', 'wins', 'partnership', 'expands', 'surges', 'success', 'milestone'];
const NEGATIVE_WORDS = ['layoffs', 'lawsuit', 'decline', 'shutdown', 'losses', 'hack', 'breach', 'recall', 'fraud', 'bankruptcy', 'crash', 'fails', 'cuts'];

function heuristicSentiment(text) {
  const lower = (text || '').toLowerCase();
  const pos = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  const neg = NEGATIVE_WORDS.filter((w) => lower.includes(w)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

function firstSentences(text, count = 2) {
  const sentences = (text || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [];
  const joined = sentences.slice(0, count).join(' ').trim();
  return joined || (text || '').slice(0, 220);
}

// ---------------------------------------------------------------------------
// 1. Batch article enrichment: summary + sentiment + relevance for the feed
// ---------------------------------------------------------------------------

/**
 * @param {Array<{title, content_snippet, source}>} articles
 * @returns {Array<{summary, sentiment, relevance_score}>} same order as input
 */
export async function enrichArticles(articles) {
  if (!articles.length) return [];

  const fallback = () =>
    articles.map((a) => ({
      summary: firstSentences(a.content_snippet || a.title, 2),
      sentiment: heuristicSentiment(`${a.title} ${a.content_snippet}`),
      relevance_score: 5,
    }));

  if (!client) return fallback();

  try {
    const system = await buildSystemPrompt();
    const list = articles
      .map((a, i) => `${i}. [${a.source}] ${a.title}\n${(a.content_snippet || '').slice(0, 300)}`)
      .join('\n\n');
    const result = await jsonChat(
      system,
      `For each numbered article below, produce:\n` +
        `- "summary": exactly 2 sentences, plain English, founder-relevant\n` +
        `- "sentiment": "positive" | "neutral" | "negative"\n` +
        `- "relevance_score": 1-10 (10 = directly impacts this founder's business)\n\n` +
        `Return JSON: { "items": [ { "index": 0, "summary": "...", "sentiment": "...", "relevance_score": 7 }, ... ] }\n\n` +
        `Articles:\n${list}`,
      { maxTokens: 3000 }
    );
    const byIndex = new Map((result.items || []).map((item) => [item.index, item]));
    return articles.map((a, i) => {
      const item = byIndex.get(i);
      if (!item) {
        return {
          summary: firstSentences(a.content_snippet || a.title, 2),
          sentiment: heuristicSentiment(`${a.title} ${a.content_snippet}`),
          relevance_score: 5,
        };
      }
      return {
        summary: item.summary || firstSentences(a.content_snippet || a.title, 2),
        sentiment: ['positive', 'neutral', 'negative'].includes(item.sentiment) ? item.sentiment : 'neutral',
        relevance_score: Math.min(10, Math.max(1, Number(item.relevance_score) || 5)),
      };
    });
  } catch (err) {
    console.warn('[openai] enrichArticles failed, using heuristics:', err.message);
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// 2. Deep-dive analysis of a single article
// ---------------------------------------------------------------------------

export async function deepDiveArticle({ title, content, source, url }) {
  const fallback = {
    key_claims: [firstSentences(content || title, 1)],
    founder_implications: 'AI analysis unavailable — configure OPENAI_API_KEY for full deep-dive analysis.',
    related_companies: [],
    action_items: [],
  };
  if (!client) return fallback;
  try {
    const system = await buildSystemPrompt();
    return await jsonChat(
      system,
      `Analyze this article in depth.\n\nTitle: ${title}\nSource: ${source || 'unknown'}\nURL: ${url || ''}\n` +
        `Content: ${(content || '').slice(0, 3000)}\n\n` +
        `Return JSON with:\n` +
        `- "key_claims": array of 3-5 short strings (the article's central claims)\n` +
        `- "founder_implications": 2-3 sentences on what this means for this founder specifically\n` +
        `- "related_companies": array of company names mentioned or clearly affected\n` +
        `- "action_items": array of 1-3 concrete things the founder could do in response`
    );
  } catch (err) {
    console.warn('[openai] deepDiveArticle failed:', err.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 3. Daily briefing
// ---------------------------------------------------------------------------

/**
 * @param {{articles: Array, competitors: Array, papers: Array}} context
 * @returns {{market_pulse, competitor_moves, research_highlights, opportunities, risks, tldr}}
 */
export async function generateBriefing({ articles, competitors, papers }) {
  const fallback = {
    tldr: articles.length
      ? `${articles.length} relevant stories in the last 24 hours. Top story: "${articles[0]?.title}". Configure OPENAI_API_KEY for full AI briefings.`
      : 'No fresh intelligence in the last 24 hours. Add topics in Settings to start tracking.',
    market_pulse: articles.slice(0, 3).map((a) => `${a.title} (${a.source})`).join(' • ') || 'No market signals yet.',
    competitor_moves: competitors.length
      ? competitors.map((c) => `${c.name}: threat level ${c.threat_level}`).join(' • ')
      : 'No competitors tracked yet — add them in Settings.',
    research_highlights: papers.slice(0, 2).map((p) => p.title).join(' • ') || 'No new papers matched your keywords.',
    opportunities: 'AI analysis unavailable without an OpenAI API key.',
    risks: 'AI analysis unavailable without an OpenAI API key.',
  };
  if (!client) return fallback;

  try {
    const system = await buildSystemPrompt();
    const newsBlock = articles
      .slice(0, 20)
      .map((a) => `- [${a.source}] ${a.title}: ${(a.ai_summary || a.content_snippet || '').slice(0, 200)}`)
      .join('\n');
    const compBlock = competitors
      .map((c) => `- ${c.name} (threat: ${c.threat_level}): ${(c.last_intel_summary || 'no intel yet').slice(0, 250)}`)
      .join('\n');
    const paperBlock = papers
      .slice(0, 8)
      .map((p) => `- ${p.title}: ${(p.ai_summary || p.abstract || '').slice(0, 200)}`)
      .join('\n');

    return await jsonChat(
      system,
      `Generate today's founder intelligence briefing from the data below.\n\n` +
        `NEWS (last 24h):\n${newsBlock || '(none)'}\n\n` +
        `COMPETITORS:\n${compBlock || '(none tracked)'}\n\n` +
        `RESEARCH PAPERS:\n${paperBlock || '(none)'}\n\n` +
        `Return JSON with exactly these string fields (2-4 sentences each, markdown allowed):\n` +
        `{ "tldr": "one-paragraph executive summary",\n` +
        `  "market_pulse": "what's moving in their market",\n` +
        `  "competitor_moves": "what competitors did and why it matters",\n` +
        `  "research_highlights": "notable research and its business relevance",\n` +
        `  "opportunities": "2-3 concrete opportunities to act on",\n` +
        `  "risks": "2-3 risks to watch" }`,
      { maxTokens: 1800, temperature: 0.5 }
    );
  } catch (err) {
    console.warn('[openai] generateBriefing failed:', err.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 4. Competitor intel summary + threat assessment
// ---------------------------------------------------------------------------

export async function competitorIntel({ competitor, news, githubActivity, jobsSignal }) {
  const fallback = {
    summary: news.length
      ? `${competitor.name} appeared in ${news.length} recent stories. Latest: "${news[0]?.title}".`
      : `No recent public activity detected for ${competitor.name}.`,
    threat_level: news.length > 5 ? 'high' : news.length > 1 ? 'medium' : 'low',
  };
  if (!client) return fallback;

  try {
    const system = await buildSystemPrompt();
    const newsBlock = news.slice(0, 10).map((n) => `- ${n.title} (${n.source})`).join('\n');
    const ghBlock = (githubActivity || []).slice(0, 8).map((e) => `- ${e.type}: ${e.repo}`).join('\n');
    return await jsonChat(
      system,
      `Assess this competitor: ${competitor.name} (${competitor.website || 'no website'}).\n\n` +
        `Recent news mentions:\n${newsBlock || '(none)'}\n\n` +
        `Recent GitHub activity:\n${ghBlock || '(none / no public org)'}\n\n` +
        `Hiring signal: ${jobsSignal || 0} hiring-related keywords found on their careers page.\n\n` +
        `Return JSON:\n` +
        `{ "summary": "3-5 sentence intel summary of what they've been up to and what it means for us",\n` +
        `  "threat_level": "low" | "medium" | "high" }`,
      { maxTokens: 700 }
    );
  } catch (err) {
    console.warn('[openai] competitorIntel failed:', err.message);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 5. Research paper enrichment: plain-English summary + founder relevance
// ---------------------------------------------------------------------------

export async function enrichPapers(papers) {
  if (!papers.length) return [];
  const fallback = () =>
    papers.map((p) => ({
      summary: firstSentences(p.abstract, 3),
      relevance_score: 5,
    }));
  if (!client) return fallback();

  try {
    const system = await buildSystemPrompt();
    const list = papers
      .map((p, i) => `${i}. ${p.title}\nAbstract: ${(p.abstract || '').slice(0, 500)}`)
      .join('\n\n');
    const result = await jsonChat(
      system,
      `For each numbered paper, produce:\n` +
        `- "summary": exactly 3 sentences of plain English (no jargon) explaining what it does and why it matters\n` +
        `- "relevance_score": 1-10, how relevant to this founder's business\n\n` +
        `Return JSON: { "items": [ { "index": 0, "summary": "...", "relevance_score": 6 }, ... ] }\n\n` +
        `Papers:\n${list}`,
      { maxTokens: 2500 }
    );
    const byIndex = new Map((result.items || []).map((item) => [item.index, item]));
    return papers.map((p, i) => {
      const item = byIndex.get(i);
      return {
        summary: item?.summary || firstSentences(p.abstract, 3),
        relevance_score: Math.min(10, Math.max(1, Number(item?.relevance_score) || 5)),
      };
    });
  } catch (err) {
    console.warn('[openai] enrichPapers failed, using heuristics:', err.message);
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// 6. "AI Explain This" for alerts
// ---------------------------------------------------------------------------

export async function explainAlert(alert) {
  if (!client) {
    return (
      `This ${alert.type.replace('_', ' ')} alert fired because "${alert.title}" matched your tracked signals. ` +
      `Configure OPENAI_API_KEY for a tailored explanation of why it matters to your business.`
    );
  }
  try {
    const system = await buildSystemPrompt();
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content:
            `Explain in 2-3 sentences why this alert matters to this founder right now:\n\n` +
            `Type: ${alert.type}\nTitle: ${alert.title}\nDetails: ${alert.content || '(none)'}\nSource: ${alert.source || 'unknown'}`,
        },
      ],
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.warn('[openai] explainAlert failed:', err.message);
    return `Alert "${alert.title}" matched your tracked signals. (AI explanation temporarily unavailable.)`;
  }
}
