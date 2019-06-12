import { Component, OnInit, Input, ViewChild, ElementRef, forwardRef } from '@angular/core';
import { NxConfigService }                                             from '../../services/nx-config';
import { NxLanguageProviderService }                                   from '../../services/nx-language-provider';
import { NxCloudApiService }                                           from '../../services/nx-cloud-api';
import { TranslateService }                                            from '@ngx-translate/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    NG_VALIDATORS,
    Validator,
    FormControl
}                                                                      from '@angular/forms';

@Component({
    selector   : 'nx-test-input',
    templateUrl: 'test.component.html',
    styleUrls  : ['test.component.scss'],
    providers  : [
        {
            provide    : NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxTestComponent),
            multi      : true
        },
        {
            provide    : NG_VALIDATORS,
            useExisting: forwardRef(() => NxTestComponent),
            multi      : true,
        },
    ],
})
export class NxTestComponent implements OnInit, ControlValueAccessor, Validator {

    @Input() required: any;
    @Input() inputErrors: any;

    CONFIG: any = {};
    LANG: any = {};
    fairPassword: boolean;
    passwordToggle: boolean;

    private value: string;
    private touched: boolean;

    // @ViewChild('registerPassword') input: ElementRef;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = () => {
    };
    private onChangeCallback = (_: any) => {
    };

    // validateFn: any = () => {
    // };
    //
    // validate(c: FormControl) {
    //     return this.validateFn(c);
    // }

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl) {
        this.touched = c.touched;

        const err = {
            required: true
        };

        const err2 = {
            common: true
        };

        const err3 = {
            weak: true
        };

        if (this.required && !c.value) {
            return err;
        }

        if (this.checkCommon(c.value)) {
            return err2;
        }

        if (this.checkComplexity(c.value)) {
            return err3;
        }

        return null; // valid
    }

    constructor(private config: NxConfigService,
                private translate: TranslateService,
                private language: NxLanguageProviderService,
                private api: NxCloudApiService) {
    }

    private loadCommonPasswords() {
        if (!this.CONFIG.commonPasswordsList) {
            this.api.getCommonPasswords()
                .subscribe(data => {
                    this.CONFIG.commonPasswordsList = data;
                });
        }
    }

    private checkCommon(value) {
        // Check if password is directly in common list
        let commonPassword = this.CONFIG.commonPasswordsList[value];

        if (!commonPassword) {
            // Check if password is in uppercase and it's lowercase value is in common list
            commonPassword = value.toUpperCase() === value &&
                    this.CONFIG.commonPasswordsList[value.toLowerCase()];
        }

        return commonPassword;
    }

    private checkComplexity(value) {
        const classes = [
            '[0-9]+',
            '[a-z]+',
            '[A-Z]+',
            '[\\W_]+'
        ];

        let classesCount = 0;

        for (const classRegex of classes) {
            if (new RegExp(classRegex).test(value)) {
                classesCount++;
            }
        }

        return classesCount < this.CONFIG.passwordRequirements.strongClassesCount;
    }

    setValue(ctrl) {
        this.onTouchedCallback();
        this.value = ctrl.value;
        this.fairPassword = this.checkComplexity(this.value) >= this.CONFIG.passwordRequirements.strongClassesCount;
        // update the form
        this.onChangeCallback(this.value);
        // var name = elm[0].id.replace(/'/g, '');
        // scope.form[name].$setUntouched();
    }

    ngOnInit() {
        // this.validateFn = createComplexityValidator();
        this.required = (this.required !== undefined);
        this.fairPassword = true;
        this.passwordToggle = false;

        this.CONFIG = this.config.getConfig();
        this.language
            .translationsSubject
            .subscribe((lang) => {
                this.LANG = lang[this.language.getLang()];
            });

        this.loadCommonPasswords(); // Load most common passwords

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
