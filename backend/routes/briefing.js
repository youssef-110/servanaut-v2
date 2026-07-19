import { Router } from 'express';
import { asyncHandler, ok } from '../middleware/errorHandler.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { buildDailyBriefing } from '../services/schedulerService.js';

const router = Router();

// GET /api/briefing — today's briefing; generated on demand if missing.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const briefing = await buildDailyBriefing({ force: false });
    ok(res, { briefing });
  })
);

// POST /api/briefing/regenerate — force a fresh briefing for today.
router.post(
  '/regenerate',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const briefing = await buildDailyBriefing({ force: true });
    ok(res, { briefing });
  })
);

export default router;
