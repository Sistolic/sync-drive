const { rateLimit } = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

exports.limiter = limiter;
