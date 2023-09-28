import { ESLintUtils } from '@typescript-eslint/utils';

import rule from '../rules/exhaustive-computed-deps';

import { classWrapper, successfulCodeObjects } from './utils';

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('exhaustive-computed-deps', rule, {
    valid: successfulCodeObjects([
        classWrapper('myComputed$$ = computed(() => this.count$$() * 2);'),
        classWrapper('myComputed$$ = computed(() => this.system$$().cameras);'),
        classWrapper(
            'readonly safeProp; myComputed$$ = computed(() => !!this.safeProp && this.signalProp$$());',
        ),
    ]),
    invalid: [
        {
            code: classWrapper('unsafeProp; myComputed$$ = computed(() => !!this.unsafeProp);'),
            errors: [{ messageId: 'nonSignalInComputed' }],
        },
        {
            code: classWrapper(
                'myComputed$$ = computed(() => this.system.isOnline || this.system.isAvailable);',
            ),
            errors: [{ messageId: 'nonSignalInComputed' }, { messageId: 'nonSignalInComputed' }],
        },
    ],
});
