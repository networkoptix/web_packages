const { ESLintUtils } = require('@typescript-eslint/utils');

const rule = require('../../dist/rules/template_translate-contents');

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@angular-eslint/template-parser',
});

ruleTester.run('template_translate-contents', rule, {
    valid: [
        { code: '<span translate>foo</span>' },
        { code: '<span [translate]="foo"></span>' },
        {
            code: '<span translate><foo></foo></span>',
            options: [['foo']],
        },
    ],
    invalid: [
        { code: '<span translate></span>', errors: [{ messageId: 'noText' }] },
        {
            code: '<span translate><p></p>foo</span>',
            errors: [{ messageId: 'notOnlyText' }],
        },
        {
            code: '<span translate><foo></foo></span>',
            options: [['bar']],
            errors: [{ messageId: 'notOnlyText' }],
        },
    ],
});
