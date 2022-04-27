import {
    Component,
    Input,
    Output,
    EventEmitter,
    forwardRef,
    OnInit,
    ViewEncapsulation,
    ViewChild
} from '@angular/core';
import {
    NG_VALUE_ACCESSOR,
    ControlValueAccessor,
    FormControl,
    Validator
} from '@angular/forms';

import { IBool, CoercedBoolInput } from '@decorators/ibool';

/* Usage
 <nx-radio
     [name]="groupName" componentId="groupID"
     [(ngModel)]="user.remember_me"
     (click)?="onClick($event)"
     [value]="SOME_VALUE"
     disabled?=BOOLEAN
 </nx-radio>
 */

@Component({
    selector: 'nx-radio',
    templateUrl: 'radio.component.html',
    styleUrls: ['radio.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxRadioComponent),
            multi: true
        }
    ],
    encapsulation: ViewEncapsulation.None
})
export class NxRadioComponent implements OnInit, ControlValueAccessor, Validator {
    @Input() componentId: string;
    @Input() name: string;
    @Input() label: string;
    @Input() value: string | number;
    @IBool() @Input() disabled: CoercedBoolInput;
    @Output() onClick = new EventEmitter<string>();

    @ViewChild('inputRadioFocus') inputRadio: HTMLFormElement;

    public state: string;
    private _value; // ngModel representation
    private _rbxStates = {
        rbFalse: 'unchecked',
        rbTrue: 'checked',
        rbDisabled: 'disabled',
        rbOrElse: 'tristate'
    };

    // the method set in registerOnChange to emit changes back to the form
    private propagateChange = (_: any): void => {
    };

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl) {
        return null; // valid
    }

    ngOnInit(): void {
        this.state = this._rbxStates.rbFalse; // 'unchecked'
    }

    /**
     * Write a new value to the element.
     */
    writeValue(value): void {
        if (value === 'tristate' || value === 1) {
            this.state = this._rbxStates.rbOrElse; // 'checked'
        } else if ((value && this.value === value)) {
            this.state = this._rbxStates.rbTrue; // 'checked'
        } else {
            // clear other radio buttons
            this.state = this._rbxStates.rbFalse; // 'unchecked'
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn): void {
        this.propagateChange = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: () => void): void {
    }

    changeState(): void {
        if (this.disabled) {
            return;
        }

        // only one change is possible false -> true
        // on ndModel change if will reset to false
        this.state = this._rbxStates.rbTrue;

        // Propagate component's value attribute (model)
        this.propagateChange(this.value);
        this.onClick.emit(this.value.toString());
    }
}
