import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef, ViewEncapsulation } from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    NG_VALIDATORS,
    Validator,
    FormControl,
    ValidationErrors,
    FormsModule,
} from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { credentialsValidation } from '@static-variables';

@Component({
    selector: 'nx-email-input',
    templateUrl: 'email.component.html',
    styleUrls: ['email.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxEmailComponent),
            multi: true,
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => NxEmailComponent),
            multi: true,
        },
    ],
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, FormsModule, NxFocusMeDirective],
    standalone: true,
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
    @Input() placeholder = '';
    @Input() required = true;

    LANG = staticLang;

    public value: string;

    constructor(private translateService: TranslateService) {}

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback = (): void => {};

    private onChangeCallback = (_: any): void => {};

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<string>): ValidationErrors | null {
        if (!c.value) {
            return !this.required
                ? null // valid
                : {
                      required: true,
                      message: this.translateService.instant(
                          this.LANG.customValidatorMsg.emailRequired,
                      ),
                  };
        }

        const EMAIL_REGEXP = new RegExp(credentialsValidation.emailRegex);
        if (!EMAIL_REGEXP.test(c.value)) {
            return {
                pattern: true,
                message: this.translateService.instant(this.LANG.customValidatorMsg.emailInvalid),
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
