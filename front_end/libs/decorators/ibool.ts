/** Type for use with `@IBool()` decorator for boolean component inputs;
 * Angular interprets no explicit input value as empty string inside the component.
 */
export type CoercedBoolInput = boolean | '';

/** A decorator for boolean inputs in components to allow specifying
 * only the input name as a shorthand for a value of true, e.g.
 * `<my-component myBool>` as equivalent to `<my-component [myBool]="true">`.
 * Note that while the value will always be a boolean after coercion, TS
 * doesn't know this so extra type assertions `as boolean` may be required
 * in the component.
 *
 * Usage: `@IBool() @Input() myBool: CoercedBoolInput;`
 *
 * Adapted from: https://github.com/angular/angular/issues/14761#issuecomment-762812772
 *
 * TODO: Keep an eye on this issue for official support
 */
export function IBool(): PropertyDecorator {
    return (target: object, propertyKey: string): void => {
        // eslint-disable-next-line symbol-description
        const hiddenKey = Symbol();

        Object.defineProperty(target, propertyKey, {
            // function used over fat arrow syntax to preserve the value of `this`
            get: function (): boolean | undefined {
                return this[hiddenKey];
            },
            set: function (extValue: CoercedBoolInput): void {
                this[hiddenKey] = extValue === true || extValue === '';
            },
        });
    };
}
