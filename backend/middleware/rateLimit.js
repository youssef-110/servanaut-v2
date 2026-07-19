import rateLimit from 'express-rate-limit';

// General API limiter: generous enough for a busy dashboard,
// tight enough to stop runaway clients from hammering upstream APIs.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — slow down.' },
});

// Stricter limiter for AI-powered endpoints (OpenAI calls cost money).
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI rate limit reached — try again in a minute.' },
});
