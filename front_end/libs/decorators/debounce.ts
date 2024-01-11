import { debounce as _debounce } from 'lodash-es';

export function debounce(
    wait: number = 100,
    options?: Parameters<typeof _debounce>[2],
): MethodDecorator {
    return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value = _debounce(descriptor.value, wait, options);
        return descriptor;
    };
}
