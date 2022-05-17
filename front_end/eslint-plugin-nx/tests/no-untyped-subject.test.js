const { RuleTester } = require('@typescript-eslint/utils/dist/ts-eslint');

const rule = require('../rules/no-untyped-subject');

const { classWrapper } = require('./utils');

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no-untyped-subject', rule, {
    valid: [
        { code: classWrapper('foo = new Subject<void>();') },
        { code: classWrapper('foo: Subject<void> = new Subject()') },
        { code: classWrapper('foo = new ReplaySubject(3)') },
        { code: classWrapper('foo = new ReplaySubject([1, 2, 3])') },
        { code: classWrapper('foo = new ReplaySubject({ a: 1, b: 2 })') },
    ],
    invalid: [
        { code: classWrapper('foo = new Subject();'), errors: 1 },
        { code: classWrapper('foo = new Subject(null);'), errors: 1 },
        { code: classWrapper('foo = new Subject(undefined);'), errors: 1 },
        { code: classWrapper('foo = new Subject([]);'), errors: 1 },
        { code: classWrapper('foo = new Subject({});'), errors: 1 },
    ],
});
