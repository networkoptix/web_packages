import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ContentChildren,
    forwardRef,
    HostListener,
    QueryList,
    signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { noop } from 'lodash-es';

import { NxFormFieldControlDirective } from '@components/forms/form-field/form-field-control.directive';

import { NX_BUTTON_TOGGLE_GROUP } from './button-toggle-group.token';
import { NxButtonToggleComponent as ButtonToggle } from './button-toggle.component';

@Component({
    selector: 'nx-button-toggle-group',
    template: `<ng-content></ng-content>`,
    styles: `
        :host {
            display: flex;
        }
    `,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxButtonToggleGroupComponent),
            multi: true,
        },
        {
            provide: NX_BUTTON_TOGGLE_GROUP,
            useExisting: NxButtonToggleGroupComponent,
        },
    ],
    standalone: true,
    hostDirectives: [NxFormFieldControlDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxButtonToggleGroupComponent<T> implements ControlValueAccessor {
    readonly NO_VALUE = Symbol('No value');
    value = signal<T | symbol>(this.NO_VALUE);
    private initialNullWrite = true;
    writeValue(value: T): void {
        if (value === null && this.initialNullWrite) {
            this.initialNullWrite = false;
            return;
        }
        this.value.set(value);
    }

    private onChange: (value: T) => void = noop;
    private onTouched: () => void = noop;
    registerOnChange(fn: (value: T) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    disabled = signal(false);
    setDisabledState(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }

    private buttons = signal<ButtonToggle<T>[]>([]);
    @ContentChildren(forwardRef(() => ButtonToggle)) protected set _buttons(
        b: QueryList<ButtonToggle<T>>,
    ) {
        this.buttons.set(b.toArray());
    }
    focused = signal<ButtonToggle<T> | null>(null);

    indexes = computed<Map<ButtonToggle<T>, number>>(
        () => new Map(this.buttons().map((b, i) => [b, i])),
    );

    @HostListener('keydown', ['$event']) protected onKeyDown(event: KeyboardEvent): void {
        if (this.disabled() || event.key === 'Tab') {
            return;
        }

        event.preventDefault();

        switch (event.key) {
            case ' ':
            case 'Enter':
                this.select(this.focused()!.value());
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                this.previous();
                break;
            case 'ArrowDown':
            case 'ArrowRight':
                this.next();
                break;
        }
    }

    private previous(): void {
        const buttons = this.buttons();
        const focused = this.focused()!;
        const index = this.indexes().get(focused)!;
        const prevButton = index === 0 ? buttons[buttons.length - 1] : buttons[index - 1];
        prevButton.elementRef.nativeElement.focus();
        if (this.value() !== this.NO_VALUE) {
            this.select(prevButton.value());
        }
        this.onTouched();
    }

    select(value: T): void {
        this.writeValue(value);
        this.onChange(value);
        this.onTouched();
    }

    private next(): void {
        const buttons = this.buttons();
        const focused = this.focused()!;
        const index = this.indexes().get(focused)!;
        const nextButton = index === buttons.length - 1 ? buttons[0] : buttons[index + 1];
        nextButton.elementRef.nativeElement.focus();
        if (this.value() !== this.NO_VALUE) {
            this.select(nextButton.value());
        }
        this.onTouched();
    }
}
