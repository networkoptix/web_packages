const path = require('path');

const karmaConfFactory = require('../../karmaConfFactory.js');
const src = path.basename(__dirname);
const appBase = path.basename(src);

module.exports = karmaConfFactory(appBase);
