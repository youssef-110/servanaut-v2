import { Router } from 'express';
import { asyncHandler, ok } from '../middleware/errorHandler.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { sendDigest } from '../services/emailService.js';
import { getDigestHistory } from '../services/supabaseService.js';

const router = Router();

// POST /api/digest/send  { to?: "override@example.com" } — "Send Now".
router.post(
  '/send',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const result = await sendDigest({ toOverride: req.body?.to });
    ok(res, { digest: result });
  })
);

// GET /api/digest/history
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const history = await getDigestHistory();
    ok(res, { history });
  })
);

export default router;
