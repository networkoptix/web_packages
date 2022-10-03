import {
    Component,
    EventEmitter,
    forwardRef,
    Input,
    OnInit,
    Output
} from '@angular/core';
import {
    ControlValueAccessor,
    FormControl,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    Validator
} from '@angular/forms';

/* Usage
 <nx-numeric
     id?="remember"
     name="remember"
     [class]="'pl-2'"
     [min]="CONFIG.servers.port.min"
     [max]="CONFIG.servers.port.max"
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
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxNumericComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => NxNumericComponent),
            multi: true
        }
    ]
})
export class NxNumericComponent implements OnInit, ControlValueAccessor, Validator {
    @Input() id: string;
    @Input() name: string;
    @Input() class: string;
    @Input() min: number;
    @Input() max: number;
    @Input() step: number;
    @Input() disabled;
    @Input() required;
    @Input() placeholder: string | number = '- -';

    @Output() onChange = new EventEmitter<number>();

    componentId: string;
    _value: number;
    _previousValue: number;
    _invalid: boolean;
    _touched: boolean;

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

        this._touched = c.touched;

        if (this.required && !c.value) {
            this._invalid = true;
            return err;
        } else {
            this._invalid = false;
            return null; // valid
        }
    }

    ngOnInit() {
        this.componentId = (this.id || this.name || 'generic') + '-numeric';
        this.required = (this.required !== undefined);// optional param
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any) {
        this._value = value;
        this._previousValue = value;
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

    valueChanged(event) {
        const value = +event.target.value;
        if (value >= this.min && value <= this.max) {
            this._value = value;
            this.setValue();
        } else {
            this._value = this._previousValue;
        }
    }

    checkValue(event) {
        if (event.key.length === 1 && event.key.match(/[^0-9]/)) {
            event.preventDefault();
        }
        return true;
    }

    setValue(event?) {
        if (
            this._value === null ||
            (typeof this._value === 'number' && !Number.isNaN(this._value))
        ) {
            if (typeof this._value === 'number') {
                if (this._value < this.min) {
                    this._value = this.min;
                } else if (this._value > this.max) {
                    this._value = this.max;
                }
            }
            if (event) {
                event.target.value = this._value;
            }
            this._previousValue = this._value;
            this.onTouchedCallback();
            this.onChangeCallback(this._value);
            this.onChange.emit(this._value);
        } else {
            // parseInt('') => NaN
            this._value = this._previousValue;
        }
    }

    onPaste(event: ClipboardEvent) {
        event.preventDefault();
        let data = event.clipboardData.getData('text');
        data = data.replace(/[^0-9]+/g, '');

        this._value = parseInt(data);
        this.setValue();
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    onBlur() {
        this.onTouchedCallback();
    }
}
