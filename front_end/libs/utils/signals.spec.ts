import { makeProxy } from './signals';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const useMakeProxy = () => {
    const initialValue = { a: 1, b: 2 };
    const proxyValue = makeProxy(initialValue);
    initialValue.a = 3;
    return { initialValue, proxyValue };
};

describe('Signal Utilities', () => {
    describe('makeProxy', () => {
        it('should match value', () => {
            const { initialValue, proxyValue } = useMakeProxy();
            expect(proxyValue).toEqual(initialValue);
        });

        it('should have a different reference', () => {
            const { initialValue, proxyValue } = useMakeProxy();
            expect(proxyValue).not.toBe(initialValue);
        });

        it('should not break instanceof checks', () => {
            class Test {
                some: 'value';
            }

            const test = new Test();
            const proxiedTest = makeProxy(test);
            const proxyIsInstanceOfTest = proxiedTest instanceof Test;
            expect(proxyIsInstanceOfTest).toBeTruthy();
        });
    });
});
