const { RuleTester } = require('@typescript-eslint/utils/dist/ts-eslint');

const rule = require('../rules/no-untyped-arg');

const { classWrapper } = require('./utils');

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no-untyped-arg', rule, {
    valid: [
        { code: '[].forEach(bar => {})' },
        { code: 'baz(function () {}, () => {})' },
        { code: '{ foo: bar => {} }' },
        { code: 'function foo(bar: number) {}' },
        { code: 'function foo(bar = 3) {}' },
        { code: 'const foo = (bar: number[] = []) => {}' },
        { code: 'function foo({ bar }: { bar: number }) {}' },
        { code: 'function foo(...bars: string[]) {}' },
    ],
    invalid: [
        { code: 'function foo(bar) {}', errors: 1 },
        { code: 'const foo = (bar) => {};', errors: 1 },
        { code: classWrapper('foo(bar) {}'), errors: 1 },
        { code: classWrapper('foo = (bar) => {};'), errors: 1 },
        { code: 'function foo(bar = []) {}', errors: 1 },
        { code: 'function foo({ bar }) {}', errors: 1 },
        { code: 'function foo(...bars) {}', errors: 1 },
    ],
});
