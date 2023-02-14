import { Component, EventEmitter, forwardRef, Input, OnInit, Output } from '@angular/core';
import {
    ControlValueAccessor,
    FormControl,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    ValidationErrors,
    Validator,
} from '@angular/forms';

import { IBool, CoercedBoolInput } from '@decorators/ibool';

/* Usage
 <nx-mat-like-input
     id?="remember"
     name="remember"
     [required]?="true"
     [label]="First Name"
     [(ngModel)]="user.firstName"
     (onChange)?="onClick($event)"
     disabled? | [disabled]='isDisabled'?
     nxFocusMe?
     setFocus?=false;
     >
 </nx-mat-like-input>
 */

@Component({
    selector: 'nx-mat-like-input',
    templateUrl: 'input.component.html',
    styleUrls: ['input.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMatLikeInputComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMatLikeInputComponent),
            multi: true,
        },
    ],
})
export class NxMatLikeInputComponent implements OnInit, ControlValueAccessor, Validator {
    @Input() componentId: string;
    @IBool() @Input() disabled: CoercedBoolInput;
    @IBool() @Input() required: CoercedBoolInput;
    @Input() label: string;
    @Input() setFocus: boolean = false;
    @Input() autocomplete: string = 'on';
    @Input() type: string = 'text';

    @Output() onChange = new EventEmitter<string>();

    value: string;

    _invalid: boolean;
    _touched: boolean;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {};

    private onChangeCallback = (fn: string): void => {};

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<number>): ValidationErrors | null {
        const err = {
            requiredError: {
                required: true,
            },
        };

        this._touched = c.touched;

        if (this.required && !c.value) {
            this._invalid = true;
            return err;
        } else {
            this._invalid = false;
            return null; // valid
        }
    }

    ngOnInit(): void {
        this.componentId = this.componentId || 'generic';
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: string): void {
        this.value = value;
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn: () => void): void {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: () => void): void {
        this.onTouchedCallback = fn;
    }

    setValue(): void {
        this.onTouchedCallback();
        this.onChangeCallback(this.value);
        this.onChange.emit(this.value);
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    onBlur(): void {
        this.onTouchedCallback();
    }
}
