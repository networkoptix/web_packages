import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/template_no-global-style-class';

const ruleTester = new RuleTester({
    parser: '@angular-eslint/template-parser',
});

ruleTester.run('template_no-global-style-class', rule, {
    valid: [
        { name: 'No classes', code: '<span></span>' },
        { name: 'No global text classes', code: '<span class="foobar"></span>' },
        { name: 'No global bound classes', code: '<span [class.foobar]="true"></span>' },
    ],
    invalid: [
        {
            name: 'Forbidden text classes',
            code: '<span class="pb-1 nx-breadcrumbs"></span>',
            errors: [{ messageId: 'forbiddenBootstrap' }, { messageId: 'forbiddenNx' }],
        },
        {
            name: 'Forbidden bound classes',
            code: '<span [class.pb-1]="true" [class.nx-breadcrumbs]="true"></span>',
            errors: [{ messageId: 'forbiddenBootstrap' }, { messageId: 'forbiddenNx' }],
        },
    ],
});
