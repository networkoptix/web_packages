import { throttle as _throttle } from 'lodash-es';

export function throttle(
    wait: number = 100,
    options?: Parameters<typeof _throttle>[2],
): MethodDecorator {
    return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value = _throttle(descriptor.value, wait, options);
        return descriptor;
    };
}
