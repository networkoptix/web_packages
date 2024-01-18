import { CommonModule } from '@angular/common';
import {
    Component,
    Input,
    Output,
    EventEmitter,
    forwardRef,
    OnInit,
    ViewEncapsulation,
    OnChanges,
    booleanAttribute,
} from '@angular/core';
import {
    NG_VALUE_ACCESSOR,
    ControlValueAccessor,
    NG_VALIDATORS,
    FormControl,
    Validator,
    ValidationErrors,
    FormsModule,
} from '@angular/forms';

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
    standalone: true,
    imports: [CommonModule, FormsModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxCheckboxComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => NxCheckboxComponent),
            multi: true,
        },
    ],
    encapsulation: ViewEncapsulation.None,
})
export class NxCheckboxComponent implements OnInit, OnChanges, ControlValueAccessor, Validator {
    @Input() componentId: string;
    @Input({ transform: booleanAttribute }) required: boolean;
    @Input() checked: boolean;
    @Input({ transform: booleanAttribute }) disabled: boolean;
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
    public validate(c: FormControl<string>): ValidationErrors | null {
        const err = {
            requiredError: {
                required: true,
            },
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
                this.value = this.checked;
            }
            this.setState();
        });
    }

    ngOnChanges(changes: NgChanges<NxCheckboxComponent>): void {
        if (changes.checked) {
            this.value = changes.checked.currentValue;
            this.state = this.cbxStates[String(this.value)];
        }
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: boolean): void {
        if (value !== null) {
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
    }

    changeState(_event: MouseEvent): void {
        if (this.disabled) {
            return;
        }

        this.onTouchedCallback();
        this.value = !this.value;
        this.setState();
        this.onClick.emit(this.value);
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    // onBlur(): void {
    //     this.onTouchedCallback();
    // }
}
