const { RuleTester } = require('@typescript-eslint/utils/dist/ts-eslint');

const rule = require('../rules/no-untyped-arg');

const { classWrapper } = require('./utils');

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no-untyped-arg', rule, {
    valid: [
        { code: 'export function foo(bar) {}' },
        { code: 'export const foo = bar => {}' },
        { code: classWrapper('foo(bar) {}') },
        { code: classWrapper('public foo = (bar) => {};') },
        { code: '{ foo: bar => {} }' },
        { code: '[].forEach(bar => {})' },
        { code: 'baz(function () {}, () => {})' },
        { code: 'function foo(bar: number) {}' },
        { code: 'function foo(bar = 3) {}' },
        { code: 'function foo(bar: number[] = []) {}' },
        { code: 'const foo = (bar: number[] = []) => {}' },
    ],
    invalid: [
        { code: classWrapper('private foo(bar) {}'), errors: 1 },
        { code: classWrapper('private foo(bar = {}) {}'), errors: 1 },
        { code: 'function foo(bar) {}', errors: 1 },
        { code: 'function foo(bar = []) {}', errors: 1 },
    ],
});
