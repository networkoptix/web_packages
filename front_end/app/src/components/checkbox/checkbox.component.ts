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
    FormControl,
    Validator
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
            useExisting: forwardRef(() => NxCheckboxComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
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
    @Input() color: string;
    @Output() onClick = new EventEmitter<string>();

    public value: any;
    public state: string;

    private touched: boolean;
    private invalid: boolean;

    private cbxStates = {
        false: 'unchecked',
        true: 'checked',
        disabled: 'disabled',
        undefined: 'tristate'
    };

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = () => {
    };

    private onChangeCallback = (_: any) => {
    };

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl) {
        const err = {
            requiredError: {
                required: true
            }
        };

        this.touched = c.touched;

        if (this.required && !c.value) {
            this.invalid = true;
            return err;
        } else {
            this.invalid = false;
            return null; // valid
        }
    }

    ngOnInit() {
        setTimeout(() => {
            // set state after model was updated
            if (this.checked !== undefined) {
                this.value = this.checked;
            }
            this.setState();
        });
    }

    ngOnChanges(changes: NgChanges<NxCheckboxComponent>): void {
        if (changes.checked) {
            this.value = changes.checked.currentValue;
            this.state = this.cbxStates[this.value];
        }
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any) {
        if (value !== null && !this.disabled ||
            this.disabled && !value) {
            this.value = value;
            this.state = this.cbxStates[this.value];
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn) {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: any): void {
        this.onTouchedCallback = fn;
    }

    private setState() {
        this.state = this.cbxStates[this.value];

        // update the form
        this.onChangeCallback(this.value);

        this.onClick.emit(this.value);
    }

    changeState(event) {
        if (this.disabled) {
            return;
        }

        this.onTouchedCallback();
        this.value = !this.value;
        this.setState();
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    onBlur() {
        this.onTouchedCallback();
    }
}
