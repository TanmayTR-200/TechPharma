const rateLimit = require('express-rate-limit');

const dashboardLimiter = rateLimit({
    windowMs: 30 * 1000, // 30 seconds
    max: 1, // limit each IP to 1 request per windowMs
    message: {
        success: false,
        error: 'Too many requests, please try again after 30 seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { dashboardLimiter };