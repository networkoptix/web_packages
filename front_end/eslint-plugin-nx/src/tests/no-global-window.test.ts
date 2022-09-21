import { ESLintUtils } from '@typescript-eslint/utils';

import rule from '../rules/no-global-window';

import * as cases from './no-global-window.cases';

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('no-global-window', rule, {
    valid: [
        { code: cases.success1 },
        { code: cases.success2 },
        { code: cases.success3 },
        { code: cases.success4 },
        { code: cases.success5 },
        { code: cases.success51 },
        { code: cases.success6 },
        { code: cases.success7 },
        { code: cases.success8 },
        { code: cases.success9 },
        { code: cases.success10 },
        { code: cases.success11 },
    ],
    invalid: [
        {
            code: cases.fail1a,
            errors: [{ messageId: 'globalWindow' }],
            output: cases.fail1b,
        },
        {
            code: cases.fail2,
            errors: [{ messageId: 'globalWindow' }],
        },
        {
            code: cases.fail3a,
            errors: [{ messageId: 'globalWindow' }],
            output: cases.fail3b,
        },
        {
            code: cases.fail4,
            errors: [{ messageId: 'globalWindow' }],
        },
    ],
});
