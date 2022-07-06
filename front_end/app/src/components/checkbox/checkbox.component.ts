import {
    Component,
    Input,
    Output,
    EventEmitter,
    forwardRef,
    OnInit,
    ViewEncapsulation,
    OnChanges
} from '@angular/core';
import {
    NG_VALUE_ACCESSOR,
    ControlValueAccessor,
    NG_VALIDATORS,
    UntypedFormControl,
    Validator,
    ValidationErrors,
} from '@angular/forms';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { NgChanges } from '@utils/ng-changes';

/* Usage
 <nx-checkbox
     name="remember" componentId="remember"
     [(ngModel)]="user.remember_me"
     (click)?="onClick($event)"
     checked?
     disabled? | [disabled]='isDisabled'?
     required?>
 </nx-checkbox>
 */

@Component({
    selector: 'nx-checkbox',
    templateUrl: 'checkbox.component.html',
    styleUrls: ['checkbox.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxCheckboxComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxCheckboxComponent),
            multi: true
        }
    ],
    encapsulation: ViewEncapsulation.None
})
export class NxCheckboxComponent implements OnInit, OnChanges, ControlValueAccessor, Validator {
    @Input() componentId: string;
    @IBool() @Input() required: CoercedBoolInput;
    @IBool() @Input() checked: CoercedBoolInput;
    @IBool() @Input() disabled: CoercedBoolInput;
    @Input() labelText: string;
    @Input() ariaText: string = '';
    @Input() color: string;
    @Output() onClick = new EventEmitter<boolean>();

    public value: boolean;
    public state: 'unchecked' | 'checked';

    private cbxStates = {
        false: 'unchecked',
        true: 'checked',
        // undefined: 'tristate'
    };

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {};
    private onChangeCallback = (_: boolean): void => {};

    // validates the form, returns null when valid else the validation object
    public validate(c: UntypedFormControl): ValidationErrors | null {
        const err = {
            requiredError: {
                required: true
            }
        };

        if (this.required && !c.value) {
            return err;
        } else {
            return null; // valid
        }
    }

    ngOnInit(): void {
        setTimeout(() => {
            // set state after model was updated
            if (this.checked !== undefined) {
                this.value = this.checked as boolean;
            }
            this.setState();
        });
    }

    ngOnChanges(changes: NgChanges<NxCheckboxComponent>): void {
        if (changes.checked) {
            this.value = changes.checked.currentValue as boolean;
            this.state = this.cbxStates[String(this.value)];
        }
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: boolean): void {
        if (
            value !== null && !this.disabled ||
            this.disabled && !value
        ) {
            this.value = value;
            this.state = this.cbxStates[String(this.value)];
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn: (_: boolean) => void): void {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: () => void): void {
        this.onTouchedCallback = fn;
    }

    private setState(): void {
        this.state = this.cbxStates[String(this.value)];

        // update the form
        this.onChangeCallback(this.value);

        this.onClick.emit(this.value);
    }

    changeState(_event: MouseEvent): void {
        if (this.disabled) {
            return;
        }

        this.onTouchedCallback();
        this.value = !this.value;
        this.setState();
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    // onBlur(): void {
    //     this.onTouchedCallback();
    // }
}
