// Email digest: builds a clean dark-themed HTML email and sends it via
// the Resend API. Digest history is persisted for the Settings page.

import { getProfile, getRecentArticles, getBriefingForDate, getRecentPapers, listAlerts, saveDigest } from './supabaseService.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.DIGEST_FROM_EMAIL || 'SERVANAUT <onboarding@resend.dev>';

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function section(title, inner) {
  return `
    <tr><td style="padding: 24px 32px 8px;">
      <h2 style="margin:0;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#8b5cf6;">${escapeHtml(title)}</h2>
    </td></tr>
    <tr><td style="padding: 0 32px 8px;">${inner}</td></tr>`;
}

export function buildDigestHtml({ profile, briefing, articles, alerts, paper }) {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const newsHtml = articles.length
    ? articles
        .map(
          (a) => `
          <div style="margin-bottom:14px;">
            <a href="${escapeHtml(a.url)}" style="color:#e2e2f0;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(a.title)}</a>
            <div style="color:#9494ac;font-size:12px;margin:2px 0 4px;">${escapeHtml(a.source)}</div>
            <div style="color:#b8b8cc;font-size:13px;line-height:1.5;">${escapeHtml(a.ai_summary || a.content_snippet || '')}</div>
          </div>`
        )
        .join('')
    : '<div style="color:#9494ac;font-size:13px;">No fresh news matched your topics today.</div>';

  const briefingHtml = briefing
    ? `<div style="color:#d6d6e6;font-size:14px;line-height:1.6;">${escapeHtml(briefing.tldr || '')}</div>`
    : '<div style="color:#9494ac;font-size:13px;">No briefing generated today.</div>';

  const alertsHtml = alerts.length
    ? `<ul style="margin:0;padding-left:18px;color:#d6d6e6;font-size:13px;line-height:1.8;">` +
      alerts.map((a) => `<li><strong>${escapeHtml(a.title)}</strong> <span style="color:#9494ac;">(${escapeHtml(a.type)})</span></li>`).join('') +
      `</ul>`
    : '<div style="color:#9494ac;font-size:13px;">No new alerts.</div>';

  const paperHtml = paper
    ? `<a href="${escapeHtml(paper.arxiv_url)}" style="color:#e2e2f0;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(paper.title)}</a>
       <div style="color:#b8b8cc;font-size:13px;line-height:1.5;margin-top:4px;">${escapeHtml(paper.ai_summary || paper.abstract || '')}</div>`
    : '<div style="color:#9494ac;font-size:13px;">No new research papers matched your keywords.</div>';

  return `
  <div style="background:#0a0a0f;padding:32px 12px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#13131a;border:1px solid #1e1e2e;border-radius:16px;overflow:hidden;" cellpadding="0" cellspacing="0">
      <tr><td style="padding:32px 32px 12px;border-bottom:1px solid #1e1e2e;">
        <div style="font-size:12px;letter-spacing:3px;color:#6366f1;font-weight:700;">SERVANAUT</div>
        <h1 style="margin:8px 0 4px;font-size:22px;color:#f2f2fa;">Your Founder Briefing</h1>
        <div style="color:#9494ac;font-size:13px;">${escapeHtml(profile.company_name)} &middot; ${date}</div>
      </td></tr>
      ${section('Executive Summary', briefingHtml)}
      ${section('Top Stories', newsHtml)}
      ${section('Alerts', alertsHtml)}
      ${section('Research Pick', paperHtml)}
      <tr><td style="padding:24px 32px 32px;border-top:1px solid #1e1e2e;">
        <div style="color:#71718a;font-size:11px;">Sent by SERVANAUT V2 — your founder intelligence OS. Manage frequency in Settings.</div>
      </td></tr>
    </table>
  </div>`;
}

/**
 * Assemble and send the digest. Returns the digest_history row.
 * Throws with a clear message if no recipient or no Resend key.
 */
export async function sendDigest({ toOverride } = {}) {
  const profile = await getProfile();
  const recipient = toOverride || profile.digest_email;
  if (!recipient) throw Object.assign(new Error('No digest email configured — set one in Settings.'), { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const [articles, briefingRow, papers, alerts] = await Promise.all([
    getRecentArticles(24, 5),
    getBriefingForDate(today),
    getRecentPapers(1),
    listAlerts({ unreadOnly: true, limit: 5 }),
  ]);

  const html = buildDigestHtml({
    profile,
    briefing: briefingRow?.content_json || null,
    articles,
    alerts,
    paper: papers[0] || null,
  });
  const subject = `SERVANAUT Briefing — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  if (!RESEND_API_KEY) {
    // Still record it so the user sees the pipeline works; flag as preview.
    const record = await saveDigest({ subject: `[PREVIEW — no RESEND_API_KEY] ${subject}`, recipient_email: recipient, content_html: html });
    return { ...record, sent: false, preview: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [recipient], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }

  const record = await saveDigest({ subject, recipient_email: recipient, content_html: html });
  return { ...record, sent: true, preview: false };
}
