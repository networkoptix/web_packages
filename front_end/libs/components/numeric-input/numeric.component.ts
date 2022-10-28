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
    ValidationErrors,
    Validator
} from '@angular/forms';

import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

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
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxNumericComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
    @Input() step: number | 'any';
    @IBool() @Input() disabled: CoercedBoolInput;
    @IBool() @Input() required: CoercedBoolInput;
    @Input() placeholder: string | number = '- -';

    @Output() onChange = new EventEmitter<number>();

    CONFIG: IConfig;
    componentId: string;
    _value: number;
    _previousValue: number;
    _invalid: boolean;
    _touched: boolean;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {
    };

    private onChangeCallback = (_: any): void => {
    };

    constructor(
        configService : NxConfigService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<number>): ValidationErrors | null {
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
        this.componentId = (this.id || this.name || 'generic') + '-numeric';
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any): void {
        this._value = value;
        this._previousValue = value;
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

    valueChanged(event): void {
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

    setValue(event?): void {
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

    onPaste(event: ClipboardEvent): void {
        event.preventDefault();
        let data = event.clipboardData.getData('text');
        data = data.replace(/[^0-9]+/g, '');

        this._value = parseInt(data);
        this.setValue();
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    onBlur(): void {
        this.onTouchedCallback();
    }
}
