import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/no-untyped-arg';

import { classWrapper } from './utils';

const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('no-untyped-arg', rule, {
    valid: [
        { code: '[].forEach(bar => {})' },
        { code: 'baz(function () {}, () => {})' },
        { code: '{ foo: bar => {} }' },
        { code: 'function foo(bar: number) {}' },
        { code: 'function foo(bar = 3) {}' },
        { code: 'const foo = (bar: number[] = []) => {}' },
        { code: 'const foo: Foo = bar => {}' },
        { code: classWrapper(' foo: Foo = bar => {}') },
        { code: 'function foo({ bar }: { bar: number }) {}' },
        { code: 'function foo(...bars: string[]) {}' },
    ],
    invalid: [
        {
            code: 'function foo(bar) {}',
            errors: [{ messageId: 'untypedArg' }],
        },
        {
            code: 'const foo = (bar) => {};',
            errors: [{ messageId: 'untypedArg' }],
        },
        {
            code: classWrapper('foo(bar) {}'),
            errors: [{ messageId: 'untypedArg' }],
        },
        {
            code: classWrapper('foo = (bar) => {};'),
            errors: [{ messageId: 'untypedArg' }],
        },
        {
            code: 'function foo(bar = []) {}',
            errors: [{ messageId: 'untypedArg' }],
        },
        {
            code: 'function foo({ bar }) {}',
            errors: [{ messageId: 'untypedArg' }],
        },
        {
            code: 'function foo(...bars) {}',
            errors: [{ messageId: 'untypedArg' }],
        },
    ],
});
