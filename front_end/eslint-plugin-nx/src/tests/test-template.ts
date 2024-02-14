import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/rule-name';

const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('rule-name', rule, {
    valid: [
        {
            code: '',
        },
    ],
    invalid: [
        {
            code: '',
            errors: [{ messageId: '' }],
        },
    ],
});
