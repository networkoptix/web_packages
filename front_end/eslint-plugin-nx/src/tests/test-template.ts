const { ESLintUtils } = require('@typescript-eslint/utils');

const rule = require('../../dist/rules/rule-name');

const ruleTester = new ESLintUtils.RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('rule-name', rule, {
    valid: [],
    invalid: [],
});
