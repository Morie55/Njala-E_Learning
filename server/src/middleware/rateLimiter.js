import rateLimit from 'express-rate-limit'

// Global API rate limiter — applied to all /api/v1/* routes
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
  skip: (req) => req.path === '/api/health', // never limit health check
})

// Mutation rate limiter — for POST/PATCH/DELETE endpoints
export const mutationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 mutations per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests. Please wait a moment before trying again.' },
})

// Rate limiter for authentication and sync routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication requests, please try again later.' },
})

// Rate limiter for file uploads and submissions
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit exceeded. Please wait a few minutes before trying again.' },
})
