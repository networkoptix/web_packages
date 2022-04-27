import {
    Component,
    Input,
    forwardRef,
    ViewEncapsulation
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    NG_VALIDATORS,
    Validator,
    FormControl
} from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-email-input',
    templateUrl: 'email.component.html',
    styleUrls: ['email.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxEmailComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxEmailComponent),
            multi: true
        }
    ],
    encapsulation: ViewEncapsulation.None
})
export class NxEmailComponent implements ControlValueAccessor, Validator {
    @Input() form;
    @Input() componentId: string;
    @Input() lockEmail: boolean;
    @Input() readonly = false;
    @Input() hideErrors = false;
    @Input() setFocus = false;
    @Input() authorize = false;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    public value: string;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback = (): void => {
    };

    private onChangeCallback = (_: any): void => {
    };

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl) {
        if (!c.value) {
            return {
                required: true
            };
        }

        const EMAIL_REGEXP = new RegExp(this.CONFIG.credentialsValidation.emailRegex);
        if (!EMAIL_REGEXP.test(c.value)) {
            return {
                pattern: true
            };
        }

        return null; // valid
    }

    constructor(configService: NxConfigService,
                private language: NxLanguageProviderService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
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
