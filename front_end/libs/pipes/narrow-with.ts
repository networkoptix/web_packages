import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'narrowWith',
})
export class NarrowWith implements PipeTransform {
    /**
     * A pure pipe that narrows a value using a narrowing function.
     *
     * This is useful within template expressions to narrow types without calling the narrowing
     * function on each change detection cycle.
     *
     * ```html
     * @if(cameraOrServer | narrowWith: isCamera) {
     *     <some-component [camera]="cameraOrServer"></some-component>
     * }
     * ```
     *
     * @param input some value to narrow
     * @param narrowingFunction function that narrows the input
     * @returns true if the input is narrowed by the narrowingFunction
     */
    transform<Input, Narrowed extends Input>(
        input: Input,
        narrowingFunction: (value: Input) => value is Narrowed,
    ): input is Narrowed {
        return narrowingFunction(input);
    }
}
