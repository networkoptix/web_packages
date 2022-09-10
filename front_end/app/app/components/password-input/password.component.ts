import {
    Component,
    OnInit,
    Input,
    forwardRef,
    ViewEncapsulation,
    OnDestroy,
    ViewChild,
    ElementRef
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    NG_VALIDATORS,
    Validator,
    UntypedFormControl,
    NgModel
} from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy()
@Component({
    selector: 'nx-password-input',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxPasswordComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxPasswordComponent),
            multi: true
        }
    ],
    encapsulation: ViewEncapsulation.None
})
export class NxPasswordComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {
    @Input() form;
    @Input() componentId: string;
    @Input() component: NgModel;
    @Input() readonly = false;
    @Input() hideErrors = false;
    @Input() hasError = false;
    @Input() authorize = false;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    fairPassword: boolean;
    passwordToggle: boolean;
    clicked: boolean = false;
    tagWidth: number;

    public value: string;

    @ViewChild('addons') addons : ElementRef<HTMLDivElement>;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback = (): void => {
    };

    private onChangeCallback = (_: any): void => {
    };

    // validates the form, returns null when valid else the validation object
    public validate(c: UntypedFormControl) {
        this.tagWidth = this.addons?.nativeElement.offsetWidth;

        if (!c.value) {
            return {
                required: true
            };
        }

        // check pattern
        if (!new RegExp(this.CONFIG.credentialsValidation.passwordRequirements.requiredRegex).test(c.value)) {
            return {
                pattern: true
            };
        }

        // check length
        if (c.value.length < this.CONFIG.credentialsValidation.passwordRequirements.minLength) {
            return {
                minlength: true
            };
        }

        if (this.checkCommon(c.value)) {
            return {
                common: true
            };
        }

        const complexity = this.checkComplexity(c.value);

        if (complexity) {
            if (complexity >= this.CONFIG.credentialsValidation.passwordRequirements.strongClassesCount) {
                this.form.form.get(this.componentId).fairPassword = false;
                return null; // valid
            } else if (complexity > 1 && complexity < this.CONFIG.credentialsValidation.passwordRequirements.strongClassesCount) {
                this.form.form.get(this.componentId).fairPassword = true;
                return null; // valid
            } else {
                return {
                    weak: true
                };
            }
        }

        return null; // valid
    }

    constructor(
        configService: NxConfigService,
        private api: NxCloudApiService
    ) {
        this.CONFIG = configService.getConfig();
    }

    private loadCommonPasswords(): void {
        if (!this.CONFIG.commonPasswordsList) {
            this.api.getCommonPasswords()
                .pipe(untilDestroyed(this))
                .subscribe(data => {
                    this.CONFIG.commonPasswordsList = data;
                });
        }
    }

    private checkCommon(value) {
        if (!this.CONFIG.commonPasswordsList) {
            return;
        }
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

        return classesCount;
    }

    setValue(): void {
        // update the form
        this.onChangeCallback(this.value);
        this.form.form.get(this.componentId).markAsUntouched();
    }

    ngOnDestroy(): void {
    }

    ngOnInit(): void {
        this.tagWidth = 0;
        this.fairPassword = true;
        this.passwordToggle = true;

        this.loadCommonPasswords(); // Load most common passwords
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: any): void {
        this.value = value;
        if (value) {
            this.setValue();
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

    onBlur(): void {
        this.onTouchedCallback();
    }
}
