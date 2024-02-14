import { RuleTester } from '@typescript-eslint/rule-tester';

import rule from '../rules/only-export-injectable';

import { joinLines } from './utils';

const ruleTester = new RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('only-export-injectable', rule, {
    valid: [
        { code: '@Injectable() export class Foo {}' },
        { code: 'export const bar = 2; export const baz = false;' },
    ],
    invalid: [
        {
            code: joinLines('@Injectable() export class Foo {}', 'export const bar = false;'),
            errors: [{ messageId: 'onlyExportInjectable' }],
        },
        {
            code: joinLines("export { baz } from '@baz';", '@Injectable() export class Foo {}'),
            errors: [{ messageId: 'onlyExportInjectable' }],
        },
        {
            code: joinLines(
                "export { baz } from '@baz';",
                '@Injectable() export class Baz {}',
                'export const bar = false;',
            ),
            errors: [{ messageId: 'onlyExportInjectable' }, { messageId: 'onlyExportInjectable' }],
        },
    ],
});
