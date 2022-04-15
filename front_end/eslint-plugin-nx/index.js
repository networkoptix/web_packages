/**
 * @fileoverview Plugin for custom ESLint rules
 */

module.exports = {
    rules: {
        'only-export-injectable': require('./rules/only-export-injectable'),
    }
};
