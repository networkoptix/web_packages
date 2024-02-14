import { RuleTester } from '@typescript-eslint/rule-tester';
import { range } from 'lodash';

import rule from '../rules/signal-naming-convention';

import * as cases from './signal-naming-convention.cases';
import { successfulCodeObjects } from './utils';

const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: '../../tsconfig.json',
        tsconfigRootDir: __dirname,
    },
});

ruleTester.run('signal-naming-convention', rule, {
    valid: successfulCodeObjects([cases.s1, cases.s2, cases.s3, cases.s4]),
    invalid: [
        {
            code: cases.f1,
            errors: range(0, 6).map(_ => ({ messageId: 'signalEnd' })),
        },
        {
            code: cases.f2,
            errors: [{ messageId: 'signalEnd' }],
        },
        {
            code: cases.f3,
            errors: range(0, 3).map(_ => ({ messageId: 'signalEnd' })),
        },
        {
            code: cases.f4,
            errors: range(0, 3).map(_ => ({ messageId: 'signalEnd' })),
        },
        {
            code: cases.f5,
            errors: [{ messageId: 'signalEnd' }],
        },
    ],
});
