import { computed, Directive, effect, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isEqual } from 'lodash-es';

const initialValue = Symbol('initialValue');

/**
 * A directive that provides a generic abstraction over the ControlValueAccessor interface.
 *
 * This is meant to be used as a host directive for components that need to implement the
 * ControlValueAccessor interface.
 *
 * To use the directive add to hostDirectives of the component and use the NgModelSignalDirective.inject
 * static method to get the directive instance.
 *
 * Example:
 *
 * ```
 * Component({
 *     ...
 *     hostDirectives: [NgModelSignalDirective],
 * })
 * export class MyComponent {
 *    ngModelSignal = NgModelSignalDirective.inject('');
 * }
 * ```
 */
@Directive({
    standalone: true,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NgModelSignalDirective),
            multi: true,
        },
    ],
})
export class NgModelSignalDirective<InitialValue = unknown> implements ControlValueAccessor {
    static inject = <T>(
        initialValue: T,
    ): Omit<
        NgModelSignalDirective<T>,
        'registerOnChange' | 'registerOnTouched' | 'setDisabledState' | 'writeValue'
    > => {
        const ngModelSignal = inject(NgModelSignalDirective);
        ngModelSignal.writeValue(initialValue);
        return ngModelSignal;
    };

    public value$$ = signal<InitialValue>(initialValue as InitialValue);
    public disabled$$ = signal(false);
    dirty$$ = computed(() => !isEqual(this.initialValue$$(), this.value$$()));

    public reset(): void {
        this.value$$.set(this.initialValue$$());
    }

    /**
     * ControlValueAccessor implementation below.
     *
     * The methods couldn't be made private because they are part of the interface.
     *
     * It's recommended to use the `NgModelSignal.withInitial` static method to
     * initialize a to get the correct type interface.
     *
     * The method also omits the ControlValueAccessor methods to avoid confusion
     * and to prevent the user from calling them directly.
     */

    private initialValue$$ = signal<InitialValue>(undefined as InitialValue);

    public writeValue(val: InitialValue): void {
        this.initialValue$$.set(val);
        this.value$$.set(val);
    }

    protected onChange = (value: InitialValue): void => {};
    public registerOnChange(fn: (value: InitialValue) => void): void {
        this.onChange = fn;
    }

    protected onTouched = (): void => {};
    public registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    public setDisabledState(isDisabled: boolean): void {
        this.disabled$$.set(isDisabled);
    }

    protected modelChangeEffect = effect(() => {
        const currentValue = this.value$$();

        if (currentValue === initialValue) {
            return;
        }

        this.onChange(currentValue);
    });
}
