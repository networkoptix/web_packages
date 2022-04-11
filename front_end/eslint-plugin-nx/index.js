/**
 * @fileoverview Plugin for custom ESLint rules
 */

module.exports = {
    rules: {
        'only-export-component': require('./rules/only-export-component'),
    }
};
