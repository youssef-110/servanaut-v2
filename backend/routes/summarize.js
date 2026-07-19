import { Router } from 'express';
import { asyncHandler, ok, ApiError } from '../middleware/errorHandler.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { deepDiveArticle } from '../services/openaiService.js';
import { getArticleById } from '../services/supabaseService.js';

const router = Router();

// POST /api/summarize — full deep-dive analysis of one article.
// Body: { article_id } OR { title, content, source, url }
router.post(
  '/',
  aiLimiter,
  asyncHandler(async (req, res) => {
    let { title, content, source, url, article_id } = req.body || {};

    if (article_id) {
      const article = await getArticleById(article_id);
      if (!article) throw new ApiError(404, 'Article not found');
      title = article.title;
      content = article.content_snippet;
      source = article.source;
      url = article.url;
    }
    if (!title) throw new ApiError(400, 'Provide article_id or a title to analyze');

    const analysis = await deepDiveArticle({ title, content, source, url });
    ok(res, { analysis });
  })
);

export default router;
