import { Pipe, PipeTransform } from '@angular/core';

/** A pipe merge two objects.
 * @param target Object one
 * @param source Object two
 * @returns result of merge operation
 */
@Pipe({ name: 'mergeObjects' })
export class ObjectsMergePipe implements PipeTransform {
    transform(target: object, source: object): object {
        if (!target && !source) {
            return null;
        }

        return {
            ...(target || {}),
            ...(source || {}),
        };
    }
}
