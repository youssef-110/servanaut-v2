import { Router } from 'express';
import { asyncHandler, ok } from '../middleware/errorHandler.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { getArxivPapers, getTrendingRepos } from '../services/researchService.js';

const router = Router();

// GET /api/research/papers?keywords=a,b
router.get(
  '/papers',
  cacheMiddleware(30 * 60),
  asyncHandler(async (req, res) => {
    const keywords = (req.query.keywords || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const { papers, stale } = await getArxivPapers(keywords);
    ok(res, { papers }, { stale });
  })
);

// GET /api/research/github?topics=a,b&language=python
router.get(
  '/github',
  cacheMiddleware(30 * 60),
  asyncHandler(async (req, res) => {
    const topics = (req.query.topics || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const language = String(req.query.language || '').trim();
    const { repos, stale } = await getTrendingRepos({ topics, language });
    ok(res, { repos }, { stale });
  })
);

export default router;
