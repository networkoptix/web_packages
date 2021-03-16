import {
    Component, EventEmitter, forwardRef,
    Input, OnInit, Output
} from '@angular/core';
import {
    ControlValueAccessor, NG_VALUE_ACCESSOR
} from '@angular/forms';

/* Usage
 <nx-numeric
     componentId="remember"
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
    selector    : 'nx-numeric',
    templateUrl : 'numeric.component.html',
    styleUrls   : ['numeric.component.scss'],
    providers   : [
        {
            provide     : NG_VALUE_ACCESSOR,
            useExisting : forwardRef(() => NxNumericComponent),
            multi       : true
        }
    ]
})
export class NxNumericComponent implements OnInit, ControlValueAccessor {
    @Input() class: string;
    @Input() min: number;
    @Input() max: number;
    @Input() step: number;
    @Input() componentId: string;
    @Input() disabled;

    @Output() onChange = new EventEmitter<number>();

    _value: number;
    _previousValue: number;
    _invalid: boolean;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = () => {
    };

    private onChangeCallback = (_: any) => {
    };

    ngOnInit() {
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

    setValue() {
        if (this._value >= this.min && this._value <= this.max) {
            this._previousValue = this._value;
            this.onTouchedCallback();
            this.onChangeCallback(this._value);
            this.onChange.emit(this._value);
        } else {
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
