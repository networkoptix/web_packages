import { CommonModule } from '@angular/common';
import {
    booleanAttribute,
    Component,
    EventEmitter,
    forwardRef,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    Validator,
    ValidationErrors,
    FormControl,
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
            multi: true,
        },
    ],
    standalone: true,
    imports: [CommonModule],
})
export class NxSwitchComponent implements OnInit, ControlValueAccessor, Validator {
    @Input() id: string;
    @Input() name: string;
    @Input({ transform: booleanAttribute }) required: boolean;
    @Input() checked: boolean;
    @Input({ transform: booleanAttribute }) disabled: boolean;
    @Input() label: string;
    @Input({ transform: booleanAttribute }) showWarning: boolean;
    @Output() onClick = new EventEmitter<boolean>();

    @Output() onSwitch = new EventEmitter<boolean>();

    componentId: string;

    protected value: boolean = false;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {};
    private onChangeCallback = (_: boolean): void => {};

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<boolean>): ValidationErrors | null {
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
        this.componentId = (this.id || this.name) + '-switch';

        setTimeout(() => {
            // set state after model was updated
            if (this.checked !== undefined) {
                this.value = this.checked;
            }
            // this.setState();
        });
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: boolean | null): void {
        if (value !== null && !this.disabled) {
            this.value = value;
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

    ngOnChanges(changes: NgChanges<NxSwitchComponent>): void {
        if (changes.checked) {
            this.value = changes.checked.currentValue;
        }
    }

    private setState(): void {
        // update the form
        this.onChangeCallback(this.value);
        this.onSwitch.emit(this.value);
    }

    changeState(): void {
        if (this.disabled) {
            // tell parent I'm "disabled"
            this.onSwitch.emit(undefined);
            return;
        }

        this.onTouchedCallback();
        this.value = !this.value;
        this.setState();
    }

    // Non input elements doesn't have onBlur ... keeping this just for reference
    onBlur(): void {
        this.onTouchedCallback();
    }
}
