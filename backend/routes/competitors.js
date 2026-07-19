import { Router } from 'express';
import { asyncHandler, ok, ApiError } from '../middleware/errorHandler.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import {
  listCompetitors,
  getCompetitor,
  addCompetitor,
  updateCompetitor,
  deleteCompetitor,
  createAlert,
} from '../services/supabaseService.js';
import { getCompanyNews, getFundingNews } from '../services/newsService.js';
import { getOrgActivity, getJobsSignal } from '../services/researchService.js';
import { competitorIntel } from '../services/openaiService.js';

const router = Router();

// GET /api/competitors
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const competitors = await listCompetitors();
    ok(res, { competitors });
  })
);

// POST /api/competitors  { name, website?, github_org?, ticker?, keywords_json? }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) throw new ApiError(400, 'Competitor name is required');
    const competitor = await addCompetitor({
      name: String(name).trim(),
      website: req.body.website,
      github_org: req.body.github_org,
      ticker: req.body.ticker,
      keywords_json: req.body.keywords_json,
    });
    ok(res, { competitor });
  })
);

// PUT /api/competitors/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'website', 'github_org', 'ticker', 'keywords_json'];
    const patch = Object.fromEntries(
      Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    );
    const competitor = await updateCompetitor(req.params.id, patch);
    if (!competitor) throw new ApiError(404, 'Competitor not found');
    ok(res, { competitor });
  })
);

// DELETE /api/competitors/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteCompetitor(req.params.id);
    ok(res, { deleted: true });
  })
);

// GET /api/competitors/:id/intel — news + GitHub + jobs signal + funding.
router.get(
  '/:id/intel',
  cacheMiddleware(15 * 60),
  asyncHandler(async (req, res) => {
    const competitor = await getCompetitor(req.params.id);
    if (!competitor) throw new ApiError(404, 'Competitor not found');

    const [newsResult, ghResult, jobs, fundingResult] = await Promise.all([
      getCompanyNews(competitor.name, competitor.keywords_json || []).catch(() => ({ articles: [], stale: false })),
      getOrgActivity(competitor.github_org),
      getJobsSignal(competitor.website),
      getFundingNews(competitor.name).catch(() => ({ articles: [], stale: false })),
    ]);

    // Persist the latest hiring signal for trend comparison.
    if (jobs.count !== competitor.jobs_signal_count) {
      await updateCompetitor(competitor.id, { jobs_signal_count: jobs.count });
    }

    ok(
      res,
      {
        competitor,
        news: newsResult.articles,
        github_activity: ghResult.events,
        jobs_signal: jobs,
        funding_news: fundingResult.articles,
      },
      { stale: newsResult.stale || ghResult.stale }
    );
  })
);

// POST /api/competitors/:id/summary — refresh the AI intel summary + threat level.
router.post(
  '/:id/summary',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const competitor = await getCompetitor(req.params.id);
    if (!competitor) throw new ApiError(404, 'Competitor not found');

    const [newsResult, ghResult, jobs] = await Promise.all([
      getCompanyNews(competitor.name, competitor.keywords_json || []).catch(() => ({ articles: [] })),
      getOrgActivity(competitor.github_org),
      getJobsSignal(competitor.website),
    ]);

    const intel = await competitorIntel({
      competitor,
      news: newsResult.articles,
      githubActivity: ghResult.events,
      jobsSignal: jobs.count,
    });

    const previousThreat = competitor.threat_level;
    const updated = await updateCompetitor(competitor.id, {
      last_intel_summary: intel.summary,
      threat_level: ['low', 'medium', 'high'].includes(intel.threat_level) ? intel.threat_level : 'low',
      jobs_signal_count: jobs.count,
    });

    if (updated.threat_level === 'high' && previousThreat !== 'high') {
      await createAlert({
        type: 'competitor',
        title: `${competitor.name} threat level raised to HIGH`,
        content: intel.summary,
        source: 'Competitor intel',
      });
    }

    ok(res, { competitor: updated });
  })
);

export default router;
