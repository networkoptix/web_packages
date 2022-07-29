const { ESLintUtils } = require('@typescript-eslint/utils');

const rule = require('../../dist/rules/only-export-injectable');

const { joinLines } = require('./utils');

const ruleTester = new ESLintUtils.RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('only-export-injectable', rule, {
    valid: [
        { code: '@Injectable() export class Foo {}' },
        { code: 'export const bar = 2; export const baz = false;' },
    ],
    invalid: [
        {
            code: joinLines(
                '@Injectable() export class Foo {}',
                'export const bar = false;',
            ),
            errors: 1,
        },
        {
            code: joinLines(
                'export { baz } from \'@baz\';',
                '@Injectable() export class Foo {}',
            ),
            errors: 1,
        },
        {
            code: joinLines(
                'export { baz } from \'@baz\';',
                '@Injectable() export class Baz {}',
                'export const bar = false;',
            ),
            errors: 2,
        },
    ],
});
