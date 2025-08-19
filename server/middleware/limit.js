const { rateLimit } = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

exports.limiter = limiter;
