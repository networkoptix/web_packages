import { Pipe, PipeTransform } from '@angular/core';

/**
 * A pipe that maps a value to another value using a function.
 *
 * @example
 * <div>{{ value | mapWith : (v) => v.property }}</div>
 */
@Pipe({
    name: 'mapWith',
})
export class MapWith implements PipeTransform {
    /**
     * A pure pipe that transforms a value using a mapping function.
     *
     * Important note on usage:
     *
     * The pipe is only evaluated when the input changes.
     * The mappingFunction should be a pure function or only reference immutable values.
     * Change detection only runs when the reference of the input changes.
     * Changes to referenced values within the mappingFunction won’t trigger change detection.
     *
     * It is recommended to pass in all dependencies of the mappingFunction as properties on an object.
     *
     * @param input value to be transformed
     * @param mappingFunction mapping function
     * @returns value transformed by mappingFunction
     */
    transform<Input, Mapped>(input: Input, mappingFunction: (value: Input) => Mapped): Mapped {
        return mappingFunction(input);
    }
}
