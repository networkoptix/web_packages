import {
    Component,
    EventEmitter,
    forwardRef,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import {
    ControlValueAccessor,
    FormControl,
    NG_VALUE_ACCESSOR,
    Validator
} from '@angular/forms';

import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-switch',
    templateUrl: 'switch.component.html',
    styleUrls: ['switch.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxSwitchComponent),
            multi: true
        }
    ]
})
export class NxSwitchComponent implements OnInit, ControlValueAccessor, Validator {
    @Input() id: string;
    @Input() name: string;
    @Input() required: boolean;
    @Input() checked: boolean;
    @Input() disabled: any;
    @Input() label: string;
    @Input() showWarning: boolean;
    @Output() onClick = new EventEmitter<boolean>();

    @Output() onSwitch = new EventEmitter<boolean>();

    private _invalid: boolean;
    private _touched: boolean;
    componentId: string;

    _value: boolean = false;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {
    };

    private onChangeCallback = (_: any): void => {
    };

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl) {
        const err = {
            requiredError: {
                required: true
            }
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
        this.componentId = (this.id || this.name) + '-switch';
        this.disabled = (this.disabled !== undefined) ? this.disabled : false; // optional param
        this.required = (this.required !== undefined); // optional param

        setTimeout(() => {
            // set state after model was updated
            if (this.checked !== undefined) {
                this._value = this.checked;
            }
            // this.setState();
        });
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any): void {
        if (value !== null && !this.disabled) {
            this._value = value;
        }
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

    ngOnChanges(changes: NgChanges<NxSwitchComponent>): void {
        if (changes.checked) {
            this._value = changes.checked.currentValue;
        }
    }

    private setState(): void {
        // update the form
        this.onChangeCallback(this._value);
        this.onSwitch.emit(this._value);
    }

    preventBubbling(event: Event): void {
        event.stopPropagation();
    }

    changeState(): void {
        if (this.disabled) {
            // tell parent I'm "disabled"
            this.onSwitch.emit(undefined);
            return;
        }

        this.onTouchedCallback();
        this._value = !this._value;
        this.setState();
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    onBlur(): void {
        this.onTouchedCallback();
    }
}
