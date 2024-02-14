import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/no-untyped-subject';

import { classWrapper } from './utils';

const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser',
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
        {
            code: classWrapper('foo = new Subject();'),
            errors: [{ messageId: 'untypedSubject' }],
        },
        {
            code: classWrapper('foo = new Subject(null);'),
            errors: [{ messageId: 'untypedSubject' }],
        },
        {
            code: classWrapper('foo = new Subject(undefined);'),
            errors: [{ messageId: 'untypedSubject' }],
        },
        {
            code: classWrapper('foo = new Subject([]);'),
            errors: [{ messageId: 'untypedSubject' }],
        },
        {
            code: classWrapper('foo = new Subject({});'),
            errors: [{ messageId: 'untypedSubject' }],
        },
    ],
});
