'use strict';

const { createStatusHandler } = require('../lib/status-probe.cjs');

// Only public, fixed service entrances are checked; no credentials are used.
module.exports = createStatusHandler();
