const { RuleTester } = require('@typescript-eslint/utils/dist/ts-eslint');

const rule = require('../rules/only-export-injectable');

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('only-export-injectable', rule, {
    valid: [
        { code: '@Injectable() export class Foo {};' },
        { code: 'export const bar = 2; export const baz = false;' },
    ],
    invalid: [
        {
            code: '@Injectable() export class Foo {}; export const bar = false;',
            errors: 1,
        },
        {
            code: 'export { baz } from \'@baz\'; @Injectable() export class Foo {};',
            errors: 1,
        },
        {
            code: 'export { baz } from \'@baz\'; @Injectable() export class Baz {}; export const bar = false;',
            errors: 2,
        },
    ],
});
