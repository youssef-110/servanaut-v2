import { Router } from 'express';
import { asyncHandler, ok, ApiError } from '../middleware/errorHandler.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { getAggregatedNews } from '../services/newsService.js';
import { setArticleRead, setArticleSaved, getSavedArticles } from '../services/supabaseService.js';

const router = Router();

// GET /api/news?topics=a,b&q=...&from=...&to=...&sort=relevance|date
router.get(
  '/',
  cacheMiddleware(60),
  asyncHandler(async (req, res) => {
    const topics = (req.query.topics || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const { articles, stale } = await getAggregatedNews(topics);

    let filtered = articles;
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      filtered = filtered.filter((a) =>
        `${a.title} ${a.content_snippet} ${a.ai_summary}`.toLowerCase().includes(q)
      );
    }
    if (req.query.from) {
      filtered = filtered.filter((a) => a.published_at && a.published_at >= String(req.query.from));
    }
    if (req.query.to) {
      const to = `${req.query.to}T23:59:59Z`;
      filtered = filtered.filter((a) => a.published_at && a.published_at <= to);
    }
    if (req.query.sentiment) {
      filtered = filtered.filter((a) => a.sentiment === req.query.sentiment);
    }
    if (req.query.sort === 'relevance') {
      filtered = [...filtered].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    } else {
      filtered = [...filtered].sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    }

    ok(res, { articles: filtered }, { stale });
  })
);

// GET /api/news/saved
router.get(
  '/saved',
  asyncHandler(async (req, res) => {
    const articles = await getSavedArticles();
    ok(res, { articles });
  })
);

// POST /api/news/:id/read  { is_read?: boolean }
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const article = await setArticleRead(req.params.id, req.body?.is_read ?? true);
    if (!article) throw new ApiError(404, 'Article not found');
    ok(res, { article });
  })
);

// POST /api/news/:id/save  { is_saved: boolean }
router.post(
  '/:id/save',
  asyncHandler(async (req, res) => {
    const article = await setArticleSaved(req.params.id, req.body?.is_saved ?? true);
    if (!article) throw new ApiError(404, 'Article not found');
    ok(res, { article });
  })
);

export default router;
