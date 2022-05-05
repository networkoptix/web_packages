const { RuleTester } = require('@typescript-eslint/utils/dist/ts-eslint');

const rule = require('../rules/no-untyped-init');

const { classWrapper } = require('./utils');

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no-untyped-init', rule, {
    valid: [
        { code: classWrapper('foo: number;') },
        { code: classWrapper('foo = 3;') },
        { code: classWrapper('foo: number = 3;') },
        { code: classWrapper('foo = [1, 2, 3];') },
        { code: classWrapper('foo = { a: 1, b: 2, c: 3 };') },
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
            errors: [{ messageId: 'untypedProp' }]
        },
        {
            code: classWrapper('foo = [];'),
            errors: [{ messageId: 'untypedProp' }]
        },
        {
            code: classWrapper('foo = {};'),
            errors: [{ messageId: 'untypedProp' }]
        },
        { code: 'let foo;', errors: [{ messageId: 'untypedDeclaration' }] },
        { code: 'let foo = [];', errors: [{ messageId: 'untypedDeclaration' }] },
        { code: 'let foo = {};', errors: [{ messageId: 'untypedDeclaration' }] },
    ],
});
