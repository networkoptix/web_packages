import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/template_require-global-style-escape';

const ruleTester = new RuleTester({
    parser: '@angular-eslint/template-parser',
});

ruleTester.run('template_require-global-style-escape', rule, {
    valid: [
        {
            name: 'Global styled and escaped element',
            code: '<button data-escape-global-style></button>',
        },
        {
            name: 'Global styled and enhanced element',
            code: '<button nx-button></button>',
        },
        {
            name: 'Global styled and other enhanced element',
            code: '<button nx-async-button></button>',
            options: [['nx-async-button']]
        },
        {
            name: 'Not global styled element',
            code: '<span></span>',
        },
    ],
    invalid: [
        {
            name: 'Global styled and not escaped element',
            code: '<button></button>',
            errors: [{ messageId: 'escapeRequired' }],
            output: '<button data-escape-global-style></button>',
        },
    ],
});
