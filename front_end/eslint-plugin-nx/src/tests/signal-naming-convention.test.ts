import { ESLintUtils } from '@typescript-eslint/utils';

import rule from '../rules/signal-naming-convention';

import { classWrapper, successfulCodeObjects } from './utils';

const ruleTester = new ESLintUtils.RuleTester({
    parser: '@typescript-eslint/parser',
});

ruleTester.run('signal-naming-convention', rule, {
    valid: successfulCodeObjects([
        'const count$$ = signal(0);',
        'const doubleCount$$ = computed(() => count$$() * 2);',
        classWrapper('count$$ = signal(0);'),
        classWrapper('compCount$$ = computed(() => this.count$$() * 2);'),
        classWrapper("converted$$ = toSignal(from(''));"),
        classWrapper('users$$ = this.store.selectSignal(selectUsers);'),
    ]),
    invalid: [
        {
            code: 'const count = signal(0);',
            errors: [{ messageId: 'signalEnd' }],
        },
        {
            code: 'const doubleCount = computed(() => count$$() * 2);',
            errors: [{ messageId: 'signalEnd' }],
        },
        {
            code: classWrapper('count = signal(0);'),
            errors: [{ messageId: 'signalEnd' }],
        },
        {
            code: classWrapper('compCount = computed(() => this.count$$() * 2);'),
            errors: [{ messageId: 'signalEnd' }],
        },
        {
            code: classWrapper("converted = toSignal(from(''));"),
            errors: [{ messageId: 'signalEnd' }],
        },
        {
            code: classWrapper('users = this.store.selectSignal(selectUsers);'),
            errors: [{ messageId: 'signalEnd' }],
        },
    ],
});
