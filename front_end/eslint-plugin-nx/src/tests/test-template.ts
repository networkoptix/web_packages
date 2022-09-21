import { ESLintUtils } from '@typescript-eslint/utils';

import rule from '../rules/rule-name';

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('rule-name', rule, {
    valid: [
        {
            code: ''
        },
    ],
    invalid: [
        {
            code: '',
            errors: [{ messageId: '' }],
        },
    ],
});
