import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/no-untyped-init';

import { classWrapper } from './utils';

const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('no-untyped-init', rule, {
    valid: [
        { code: classWrapper('foo: number;') },
        { code: classWrapper('foo = 3;') },
        { code: classWrapper('foo: number = 3;') },
        { code: classWrapper('foo = [1, 2, 3];') },
        { code: classWrapper('foo = { a: 1, b: 2, c: 3 };') },
        { code: classWrapper('constructor(public foo: bar) {}') },
        { code: classWrapper('constructor(public foo = baz) {}') },
        { code: classWrapper('constructor(public foo: bar = baz) {}') },
        { code: 'let foo: number;' },
        { code: 'let foo = 3;' },
        { code: 'let foo: number = 3;' },
        { code: 'let foo = [1, 2, 3];' },
        { code: 'let foo = { a: 1, b: 2, c: 3 };' },
        { code: 'for (let i = 0; i < 1; i++) {}' },
        { code: 'for (const foo of foobar) {}' },
        { code: 'for (const foo in foobar) {}' },
    ],
    invalid: [
        {
            code: classWrapper('foo;'),
            errors: [{ messageId: 'untypedProp' }],
        },
        {
            code: classWrapper('foo = undefined;'),
            errors: [{ messageId: 'untypedProp' }],
        },
        {
            code: classWrapper('foo = null;'),
            errors: [{ messageId: 'untypedProp' }],
        },
        {
            code: classWrapper('foo = [];'),
            errors: [{ messageId: 'untypedProp' }],
        },
        {
            code: classWrapper('foo = {};'),
            errors: [{ messageId: 'untypedProp' }],
        },
        {
            code: classWrapper('constructor(public foo) {}'),
            errors: [{ messageId: 'untypedParamProp' }],
        },
        {
            code: classWrapper('constructor(public foo = []) {}'),
            errors: [{ messageId: 'untypedParamProp' }],
        },
        { code: 'let foo;', errors: [{ messageId: 'untypedDeclaration' }] },
        {
            code: 'let foo = undefined;',
            errors: [{ messageId: 'untypedDeclaration' }],
        },
        {
            code: 'let foo = null;',
            errors: [{ messageId: 'untypedDeclaration' }],
        },
        {
            code: 'let foo = [];',
            errors: [{ messageId: 'untypedDeclaration' }],
        },
        {
            code: 'let foo = {};',
            errors: [{ messageId: 'untypedDeclaration' }],
        },
    ],
});
