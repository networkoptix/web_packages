/**
 * @fileoverview Plugin for custom ESLint rules
 */

function exportRule(ruleName, fileName) {
    return {
        [ruleName]: require(`./rules/${fileName || ruleName}`)
    };
}

module.exports = {
    rules: {
        ...exportRule('only-export-injectable'),
        ...exportRule('explicit-input-output-types'),
        ...exportRule('no-useless-constructor'),
        ...exportRule('no-untyped-init'),
    }
};
