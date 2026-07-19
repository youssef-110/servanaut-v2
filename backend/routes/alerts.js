import { Router } from 'express';
import { asyncHandler, ok, ApiError } from '../middleware/errorHandler.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import {
  listAlerts,
  getAlert,
  setAlertRead,
  markAllAlertsRead,
  unreadAlertCount,
} from '../services/supabaseService.js';
import { explainAlert } from '../services/openaiService.js';

const router = Router();

// GET /api/alerts?type=watchlist&unread=true
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const alerts = await listAlerts({
      type: req.query.type || undefined,
      unreadOnly: req.query.unread === 'true',
    });
    ok(res, { alerts });
  })
);

// GET /api/alerts/unread-count — sidebar badge.
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await unreadAlertCount();
    ok(res, { count });
  })
);

// POST /api/alerts/read-all
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await markAllAlertsRead();
    ok(res, { done: true });
  })
);

// POST /api/alerts/:id/read
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const alert = await setAlertRead(req.params.id, req.body?.is_read ?? true);
    if (!alert) throw new ApiError(404, 'Alert not found');
    ok(res, { alert });
  })
);

// POST /api/alerts/:id/explain — "AI Explain This"
router.post(
  '/:id/explain',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const alert = await getAlert(req.params.id);
    if (!alert) throw new ApiError(404, 'Alert not found');
    const explanation = await explainAlert(alert);
    ok(res, { explanation });
  })
);

export default router;
