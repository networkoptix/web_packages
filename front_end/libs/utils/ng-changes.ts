type MarkFunctionProperties<Component> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [Key in keyof Component]: Component[Key] extends Function ? never : Key;
};

type ExcludeFunctionPropertyNames<T> = MarkFunctionProperties<T>[keyof T];

type ExcludeFunctions<T> = Pick<T, ExcludeFunctionPropertyNames<T>>;

/** A custom type for type safety when accessing changes in `ngOnChanges()`.
 *
 * USAGE: `ngOnChanges(changes: NgChanges<Component>)`
 *
 * Source: https://github.com/angular/angular/issues/17560#issuecomment-770796481
 *
 * TODO: Keep an eye on this issue for official support
 */
export type NgChanges<Component, Props = ExcludeFunctions<Component>> = {
    [Key in keyof Props]?: {
        previousValue: Props[Key];
        currentValue: Props[Key];
        firstChange: boolean;
        isFirstChange(): boolean;
    };
};
