import { Router } from 'express';
import { asyncHandler, ok } from '../middleware/errorHandler.js';
import { getProfile, updateProfile } from '../services/supabaseService.js';
import { cache } from '../middleware/cache.js';

const router = Router();

// GET /api/settings — founder profile + preferences.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await getProfile();
    ok(res, { profile });
  })
);

// PUT /api/settings — update any subset of profile fields.
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const allowed = [
      'company_name',
      'description',
      'stage',
      'industry',
      'topics_json',
      'research_keywords_json',
      'github_topics_json',
      'tracked_tickers_json',
      'digest_email',
      'digest_frequency',
      'digest_time',
      'refresh_interval_minutes',
    ];
    const patch = Object.fromEntries(
      Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    );
    const profile = await updateProfile(patch);

    // Topics changed → cached news/research is stale; drop it.
    cache.invalidatePrefix('news:');
    cache.invalidatePrefix('arxiv:');
    cache.invalidatePrefix('gh-trending:');
    cache.invalidatePrefix('route:');

    ok(res, { profile });
  })
);

export default router;
