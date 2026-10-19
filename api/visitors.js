'use strict';

const { createVisitorsHandler } = require('../lib/visitor-countries.cjs');

// Aggregated visitors per country from Vercel Web Analytics; the token stays server-side.
module.exports = createVisitorsHandler();
