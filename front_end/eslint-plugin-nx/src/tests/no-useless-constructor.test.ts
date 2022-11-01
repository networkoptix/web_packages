import { ESLintUtils } from '@typescript-eslint/utils';

import rule from '../rules/no-useless-constructor';

import { classWrapper } from './utils';

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('no-useless-constructor', rule, {
    valid: [
        { code: classWrapper('constructor() {}', '', 'myParent') },
        { code: classWrapper('constructor()') },
        {
            code: classWrapper(`constructor(myService: MyService) {
                const foo = 2;
            }`)
        },
        { code: classWrapper('constructor(myService: MyService) {}') },
        { code: classWrapper('constructor() { const foo = 2; }') },
    ],
    invalid: [
        {
            code: classWrapper('constructor() {}'),
            errors: [{
                messageId: 'useless',
                suggestions: [{
                    messageId: 'removeUseless',
                    output: classWrapper('')
                }]
            }],
        },
        {
            code: classWrapper('constructor();\nconstructor() { }'),
            // @ts-expect-error TODO: make rule handle overloads better
            errors: 1,
        },
    ],
});
