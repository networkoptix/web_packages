import {
    Component,
    OnInit,
    Input,
    forwardRef,
    ViewEncapsulation
} from '@angular/core';
import { NxConfigService }           from '../../services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    NG_VALIDATORS,
    Validator,
    FormControl
}                                    from '@angular/forms';
import { IConfig } from '../../services/nx-config/config-types';

@Component({
    selector   : 'nx-email-input',
    templateUrl: 'email.component.html',
    styleUrls  : ['email.component.scss'],
    providers  : [
        {
            provide    : NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxEmailComponent),
            multi      : true
        },
        {
            provide    : NG_VALIDATORS,
            useExisting: forwardRef(() => NxEmailComponent),
            multi      : true,
        },
    ],
    encapsulation: ViewEncapsulation.None
})
export class NxEmailComponent implements ControlValueAccessor, Validator {

    @Input() form: any;
    @Input() componentId: string;
    @Input() lockEmail: boolean;


    CONFIG: IConfig;
    LANG: any = {};

    private value: string;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = () => {
    };
    private onChangeCallback = (_: any) => {
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
        this.LANG = this.language.getTranslations();
    }

    setValue() {
        // update the form
        this.onChangeCallback(this.value);
        this.form.form.get(this.componentId).markAsUntouched();
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any) {
        if (value !== null) {
            this.value = value;
        }
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

}
