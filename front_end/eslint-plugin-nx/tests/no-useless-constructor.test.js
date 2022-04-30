const { RuleTester } = require('@typescript-eslint/utils/dist/ts-eslint');

const rule = require('../rules/no-useless-constructor');

const { classWrapper } = require('./utils');

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
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
                message: 'Useless constructor.',
                suggestions: [{
                    desc: 'Remove useless constructor',
                    output: classWrapper('')
                }]
            }],
        },
        {
            code: classWrapper('constructor()\nconstructor() { }'),
            errors: 1,
        },
    ],
});
