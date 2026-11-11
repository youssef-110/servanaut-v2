import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { startScheduler, refreshNewsJob } from './services/schedulerService.js';
import { usingSupabase } from './services/supabaseService.js';
import { usingOpenAI } from './services/openaiService.js';

import newsRouter from './routes/news.js';
import briefingRouter from './routes/briefing.js';
import competitorsRouter from './routes/competitors.js';
import marketRouter from './routes/market.js';
import researchRouter from './routes/research.js';
import watchlistRouter from './routes/watchlist.js';
import alertsRouter from './routes/alerts.js';
import summarizeRouter from './routes/summarize.js';
import digestRouter from './routes/digest.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;
// On Vercel the client IP arrives via one trusted proxy hop; the rate limiter needs it.
if (process.env.VERCEL) app.set('trust proxy', 1);

// CORS: allow the configured frontend plus local dev origins.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // The deployed frontend proxies /api to this backend, so its calls arrive same-origin.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

// Health + config visibility (never exposes key values).
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime_seconds: Math.round(process.uptime()),
      integrations: {
        supabase: usingSupabase,
        openai: usingOpenAI,
        newsapi: Boolean(process.env.NEWS_API_KEY),
        guardian: Boolean(process.env.GUARDIAN_API_KEY),
        alpha_vantage: Boolean(process.env.ALPHA_VANTAGE_KEY),
        resend: Boolean(process.env.RESEND_API_KEY),
        github: Boolean(process.env.GITHUB_TOKEN),
      },
    },
  });
});

app.use('/api/news', newsRouter);
app.use('/api/briefing', briefingRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/market', marketRouter);
app.use('/api/research', researchRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/digest', digestRouter);
app.use('/api/settings', settingsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n  SERVANAUT V2 backend listening on http://localhost:${PORT}`);
  console.log(`  Supabase: ${usingSupabase ? 'connected' : 'in-memory fallback'} | OpenAI: ${usingOpenAI ? 'enabled' : 'heuristic fallback'}\n`);
  // Serverless functions are frozen between requests, so cron jobs cannot run there.
  // On Vercel the news cache fills on the first request instead.
  if (!process.env.VERCEL) {
    startScheduler();
    // Warm the news cache + fire watchlist scan shortly after boot.
    setTimeout(() => refreshNewsJob(), 3000);
  }
});
