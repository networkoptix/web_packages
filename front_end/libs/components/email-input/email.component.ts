import { Component, Input, forwardRef, ViewEncapsulation } from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    NG_VALIDATORS,
    Validator,
    FormControl,
    ValidationErrors,
} from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { credentialsValidation } from '@lib/variables/static-variables';

@Component({
    selector: 'nx-email-input',
    templateUrl: 'email.component.html',
    styleUrls: ['email.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxEmailComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxEmailComponent),
            multi: true,
        },
    ],
    encapsulation: ViewEncapsulation.None,
})
export class NxEmailComponent implements ControlValueAccessor, Validator {
    @Input() form;
    @Input() componentId: string;
    @Input() lockEmail: boolean;
    @Input() readonly = false;
    @Input() hideErrors = false;
    @Input() setFocus = false;
    @Input() authorize = false;
    @Input() isUsername = false;

    LANG = staticLang;

    public value: string;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback = (): void => {};

    private onChangeCallback = (_: any): void => {};

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<string>): ValidationErrors | null {
        if (!c.value) {
            return {
                required: true,
            };
        }

        const EMAIL_REGEXP = new RegExp(credentialsValidation.emailRegex);
        if (!EMAIL_REGEXP.test(c.value)) {
            return {
                pattern: true,
            };
        }

        return null; // valid
    }

    setValue(newValue): void {
        // update the form
        this.onChangeCallback(newValue);
        this.form.form.get(this.componentId).markAsUntouched();
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any): void {
        if (value !== null) {
            this.value = value;
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
}
