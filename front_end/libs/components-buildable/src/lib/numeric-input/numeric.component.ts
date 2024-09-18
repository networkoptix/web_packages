import { CommonModule } from '@angular/common';
import {
    booleanAttribute,
    Component,
    ElementRef,
    EventEmitter,
    forwardRef,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import {
    ControlValueAccessor,
    FormControl,
    FormsModule,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    ValidationErrors,
    Validator,
} from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

/* Usage
 <nx-numeric
     id?="remember"
     name="remember"
     [class]="'pl-2'"
     [min]="servers.port.min"
     [max]="servers.port.max"
     [(ngModel)]="user.remember_me"
     (onChange)?="onClick($event)"
     disabled? | [disabled]='isDisabled'?
     >
 </nx-numeric>
 */

@Component({
    selector: 'nx-numeric',
    templateUrl: 'numeric.component.html',
    styleUrls: ['numeric.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, AngularSvgIconModule, NxAddSvgSrcDirective],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxNumericComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => NxNumericComponent),
            multi: true,
        },
    ],
})
export class NxNumericComponent implements OnInit, ControlValueAccessor, Validator {
    @Input() id: string;
    @Input() name: string;
    @Input() class: string;
    @Input() min: number;
    @Input() max: number;
    @Input() step: number | 'any';
    @Input({ transform: booleanAttribute }) disabled: boolean;
    @Input({ transform: booleanAttribute }) required: boolean;
    @Input() placeholder: string | number = '- -';

    @Output() onChange = new EventEmitter<number>();

    @ViewChild('input') input: ElementRef<HTMLInputElement>;

    componentId: string;
    _value: number;
    _invalid: boolean;
    _touched: boolean;
    icons = icons;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {};

    private onChangeCallback = (_: any): void => {};

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<number>): ValidationErrors | null {
        const err = {
            requiredError: {
                required: true,
            },
        };

        this._touched = c.touched;

        // does this work with 0 correctly?
        if (this.required && !c.value) {
            this._invalid = true;
            return err;
        } else {
            this._invalid = false;
            return null; // valid
        }
    }

    ngOnInit(): void {
        this.componentId = (this.id || this.name || 'generic') + '-numeric';
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any): void {
        this._value = value;
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn): void {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: any): void {
        this.onTouchedCallback = fn;
    }

    setValue(value: number | null): void {
        if (value !== null && Number.isNaN(value)) {
            return;
        }
        if (typeof value === 'number') {
            this._value = Math.max(this.min, Math.min(this.max, value));
        } else {
            this._value = null;
        }

        this.onTouchedCallback();
        this.onChangeCallback(this._value);
        this.onChange.emit(this._value);
    }

    getNativeValue(): number | null {
        if (this.input.nativeElement.value === '') {
            return null;
        }
        return parseInt(this.input.nativeElement.value);
    }

    onKeyDown(event: KeyboardEvent) {
        // improve? to bypass ⌘+V, ✲+V, ⌘+C, ✲+C
        // improve? to bypass ',' and '.' of step is decimal
        if (event.key.length === 1 && event.key.match(/[^0-9]/)) {
            event.preventDefault();
        }
        return true;
    }

    valueChanged(event?: Event | undefined) {
        this.setValue(this.getNativeValue());

        if (event) {
            this.checkUpdateNativeValue(this._value, event.target as HTMLInputElement);
        }
    }

    checkUpdateNativeValue(value: number | null, input: HTMLInputElement) {
        if (this.getNativeValue() === value) {
            return;
        }
        // Edge case when value is not autocorrected by the input
        // (select value in the input and press 0. UI value will be 0 even if the min === 1)
        input.value = `${value === null ? '' : value}`;
    }

    increment(event: MouseEvent) {
        this.input.nativeElement.stepUp();
        event.preventDefault();
        this.setValue(this.getNativeValue());
    }

    decrement(event: MouseEvent) {
        this.input.nativeElement.stepDown();
        event.preventDefault();
        this.setValue(this.getNativeValue());
    }

    onPaste(event: ClipboardEvent): void {
        event.preventDefault();

        let data = event.clipboardData.getData('text');
        data = data.replace(/[^0-9]+/g, '');

        this.setValue(parseInt(data));
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    onBlur(): void {
        this.onTouchedCallback();
    }
}
