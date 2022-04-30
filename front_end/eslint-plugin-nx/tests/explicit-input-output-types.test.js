const { RuleTester } = require('@typescript-eslint/utils/dist/ts-eslint');

const rule = require('../rules/explicit-input-output-types');

const { classWrapper } = require('./utils');

const ruleTester = new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('explicit-input-output-types', rule, {
    valid: [
        { code: classWrapper('@Input() validI1: number;') },
        { code: classWrapper('@Input() validI2: number = 3;') },
        { code: classWrapper('@Output() validO1') },
        {
            code: classWrapper(
                '@Output() validO2 = new EventEmitter<number>();'
            ),
        },
        {
            code: classWrapper(
                '@Output() validO3: EventEmitter<string> = new EventEmitter();'
            ),
        },
        {
            code: classWrapper(
                '@Output() validO4: EventEmitter<string> = new EventEmitter<string>();'
            ),
        },
    ],
    invalid: [
        {
            code: classWrapper('@Input() invalidI1;'),
            errors: 1,
        },
        {
            code: classWrapper('@Input() invalidI2 = false;'),
            errors: [{
                message: 'Missing Input type.',
                suggestions: [{
                    desc: 'Infer type from default value',
                    output: classWrapper('@Input() invalidI2: boolean = false;')
                }]
            }]
        },
        {
            code: classWrapper('@Input() invalidI3 = 3;'),
            errors: [{
                message: 'Missing Input type.',
                suggestions: [{
                    desc: 'Infer type from default value',
                    output: classWrapper('@Input() invalidI3: number = 3;')
                }]
            }]
        },
        {
            code: classWrapper('@Input() invalidI4 = \'foo\';'),
            errors: [{
                message: 'Missing Input type.',
                suggestions: [{
                    desc: 'Infer type from default value',
                    output: classWrapper('@Input() invalidI4: string = \'foo\';')
                }]
            }]
        },
        {
            code: classWrapper('@Output() invalidO1 = new EventEmitter();'),
            errors: 1,
        },
        {
            code: classWrapper(
                '@Output() invalidO2: EventEmitter = new EventEmitter();'
            ),
            errors: 1,
        },
    ],
});
