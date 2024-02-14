import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/template_no-untranslated';

import * as cases from './template_no-untranslated.cases';

const ruleTester = new RuleTester({
    parser: '@angular-eslint/template-parser',
});

ruleTester.run('no-untranslated', rule, {
    valid: [
        { code: '<span translate>foo</span>' },
        { code: '<span [translate]="bar.baz"></span>' },
        { code: '<span>—</span>' },
        { code: '<span>000&nbsp;123</span>' },
        { code: '<span>{{ foo }}</span>' },
        { code: '<svg><style>.st0 { fill: #eee; }</style></svg>' },
        { code: '<span>GB<span>' },
        { code: '<span>{{ remaining }} GB<span>' },
    ],
    invalid: [
        {
            code: '<span>foo</span>',
            errors: [{ messageId: 'translationRequired' }],
            output: '<span translate>foo</span>',
        },
        {
            code: cases.fail1a,
            errors: [{ messageId: 'translationRequired' }],
            output: cases.fail1b,
        },
        {
            code: cases.fail2a,
            errors: [{ messageId: 'translationRequired' }],
            output: cases.fail2b,
        },
        {
            code: cases.fail3a,
            errors: [{ messageId: 'translationRequired' }],
            output: cases.fail3b,
        },
        {
            code: '<span>foo {{ bar }} baz</span>',
            errors: [{ messageId: 'untranslatedText' }],
        },
        {
            code: '<div>foo {{ bar }} <span translate>baz</span> asdf</div>',
            errors: [{ messageId: 'untranslatedText' }],
        },
        {
            code: '<span>Only {{ remaining }} GB remaining</span>',
            errors: [{ messageId: 'untranslatedText' }],
        },
    ],
});
