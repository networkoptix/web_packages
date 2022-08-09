const { ESLintUtils } = require('@typescript-eslint/utils');

const rule = require('../../dist/rules/template_require-translate');

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@angular-eslint/template-parser',
});

ruleTester.run('rule-name', rule, {
    valid: [
        { code: '<span translate>foo</span>' },
        { code: '<span [translate]="bar.baz"></span>' },
        { code: '<span>—</span>' },
        { code: '<span>000&nbsp;123</span>' },
        { code: '<span>{{ foo }}</span>' },
    ],
    invalid: [
        {
            code: '<span>foo</span>',
            errors: [{ messageId: 'translationRequired' }],
        },
        {
            code: '<span>foo {{ bar }} baz</span>',
            errors: [{ messageId: 'untranslatedText' }],
        },
        {
            code: '<div>foo {{ bar }} <span translate>baz</span> asdf</div>',
            errors: [{ messageId: 'untranslatedText' }],
        },
    ],
});
