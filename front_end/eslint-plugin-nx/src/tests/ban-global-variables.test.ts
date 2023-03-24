import { ESLintUtils } from '@typescript-eslint/utils';

import rule from '../rules/ban-global-variables';

import * as cases from './ban-global-variables.cases';

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('ban-global-variables', rule, {
    valid: [
        { code: cases.success1, options: [['window']] },
        { code: cases.success2, options: [['window']] },
        { code: cases.success3, options: [['window']] },
        { code: cases.success4, options: [['window']] },
        { code: cases.success5, options: [['window']] },
        { code: cases.success51, options: [['window']] },
        { code: cases.success6, options: [['window']] },
        { code: cases.success7, options: [['window']] },
        { code: cases.success8, options: [['window']] },
        { code: cases.success9, options: [['window']] },
        { code: cases.success10, options: [['window']] },
        { code: cases.success11, options: [['window']] },
        { code: cases.success12, options: [['window']] },
        { code: cases.success13, options: [['window']] },
    ],
    invalid: [
        {
            code: cases.fail1a,
            errors: [{ messageId: 'forbiddenGlobal' }],
            output: cases.fail1b,
            options: [['window']],
        },
        {
            code: cases.fail2,
            errors: [{ messageId: 'forbiddenGlobal' }],
            options: [['window']],
        },
        {
            code: cases.fail3a,
            errors: [{ messageId: 'forbiddenGlobal' }],
            output: cases.fail3b,
            options: [['window']],
        },
        {
            code: cases.fail4,
            errors: [{ messageId: 'forbiddenGlobal' }],
            options: [['window']],
        },
    ],
});
