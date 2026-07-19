import { Router } from 'express';
import { asyncHandler, ok, ApiError } from '../middleware/errorHandler.js';
import {
  listWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  deleteWatchlistItem,
  listAlerts,
} from '../services/supabaseService.js';

const router = Router();

// GET /api/watchlist
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await listWatchlist();
    ok(res, { items });
  })
);

// POST /api/watchlist  { label, keywords_json?, priority? }
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { label } = req.body || {};
    if (!label || !String(label).trim()) throw new ApiError(400, 'Watchlist label is required');
    const item = await addWatchlistItem({
      label: String(label).trim(),
      keywords_json: req.body.keywords_json,
      priority: req.body.priority,
    });
    ok(res, { item });
  })
);

// PUT /api/watchlist/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const allowed = ['label', 'keywords_json', 'priority'];
    const patch = Object.fromEntries(
      Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    );
    const item = await updateWatchlistItem(req.params.id, patch);
    if (!item) throw new ApiError(404, 'Watchlist item not found');
    ok(res, { item });
  })
);

// DELETE /api/watchlist/:id
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteWatchlistItem(req.params.id);
    ok(res, { deleted: true });
  })
);

// GET /api/watchlist/:id/matches — recent alerts that mention this item.
router.get(
  '/:id/matches',
  asyncHandler(async (req, res) => {
    const items = await listWatchlist();
    const item = items.find((w) => w.id === req.params.id);
    if (!item) throw new ApiError(404, 'Watchlist item not found');

    const alerts = await listAlerts({ limit: 200 });
    const needle = `"${item.label}"`.toLowerCase();
    const matches = alerts
      .filter(
        (a) =>
          (a.type === 'watchlist' || a.type === 'research') &&
          a.title.toLowerCase().includes(needle)
      )
      .slice(0, 10);
    ok(res, { item, matches });
  })
);

export default router;
