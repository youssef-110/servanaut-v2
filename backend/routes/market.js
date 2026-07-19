import { Router } from 'express';
import { asyncHandler, ok } from '../middleware/errorHandler.js';
import { cacheMiddleware } from '../middleware/cache.js';
import { getQuotes, getMarketSentiment, getHotTopics } from '../services/marketService.js';
import { getProfile, listCompetitors } from '../services/supabaseService.js';

const router = Router();

// GET /api/market/quotes?symbols=NVDA,TSLA — falls back to tracked tickers
// from the profile + public competitors when no symbols are given.
router.get(
  '/quotes',
  cacheMiddleware(5 * 60),
  asyncHandler(async (req, res) => {
    let symbols = (req.query.symbols || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!symbols.length) {
      const [profile, competitors] = await Promise.all([getProfile(), listCompetitors()]);
      symbols = [
        ...(profile.tracked_tickers_json || []),
        ...competitors.map((c) => c.ticker).filter(Boolean),
      ];
    }
    if (!symbols.length) return ok(res, { quotes: [] });

    const { quotes, stale } = await getQuotes(symbols.slice(0, 8));
    ok(res, { quotes }, { stale });
  })
);

// GET /api/market/sentiment — aggregate news sentiment gauge (0-100).
router.get(
  '/sentiment',
  cacheMiddleware(5 * 60),
  asyncHandler(async (req, res) => {
    const { sentiment, stale } = await getMarketSentiment();
    ok(res, { sentiment }, { stale });
  })
);

// GET /api/market/hot-topics — trending keyword frequency this week.
router.get(
  '/hot-topics',
  cacheMiddleware(15 * 60),
  asyncHandler(async (req, res) => {
    const { topics, stale } = await getHotTopics();
    ok(res, { topics }, { stale });
  })
);

export default router;
