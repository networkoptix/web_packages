import { Pipe, PipeTransform } from '@angular/core';

/** A pipe that cast a value to a specific type.
 *
 * Example usage:
 *
 * (value | as : SomeClass).property
 *
 * (value | as : SomeInterface).property
 *
 * (value | as : '').substr(1)
 *
 * (value | as : 123).toFixed(2)
 *
 * Usage with keyvalue pipe:
 *
 * let item of items | as : {keyType: ValueType} | keyvalue
 *
 * @param value Value of unknown type to cast
 * @param _type Class, Interface, or value from which type can be inferred
 * @returns Typed value
 */
@Pipe({
    name: 'as',
    pure: true,
})
export class AsPipe implements PipeTransform {
    transform<T>(value: unknown, _type: (new (...args: unknown[]) => T) | T): T {
        return value as T;
    }
}
