import {
    Component,
    OnInit,
    Input,
    forwardRef,
    // ViewEncapsulation,
    OnDestroy,
    ViewChild,
    ElementRef,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR,
    NG_VALIDATORS,
    Validator,
    NgModel,
    ValidationErrors,
    FormControl,
    NgForm
} from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { POS_STRATEGY } from '@components/popover/popover-config';
import { NxPopoverService } from '@components/popover/popover.service';
import { credentialsValidation, icons } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy()
@Component({
    selector: 'nx-mat-like-password-input',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMatLikePasswordComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxMatLikePasswordComponent),
            multi: true
        }
    ],
    // encapsulation: ViewEncapsulation.None
})
export class NxMatLikePasswordComponent implements OnInit, OnDestroy, ControlValueAccessor, Validator {
    @Input() form: NgForm;
    @Input() componentId: string;
    @Input() component: NgModel;
    @Input() readonly: boolean = false;
    @Input() hideErrors: boolean = false;
    @Input() hasError: boolean = false;
    @Input() label: string;
    @Input() setFocus: boolean = false;
    @Input() confirmation: boolean = false;
    @Input() validation: boolean = false;

    CONFIG: IConfig;
    LANG = staticLang;
    fairPassword: boolean;
    passwordToggle: boolean;
    clicked: boolean = false;
    credentialsValidation = credentialsValidation;
    icons = icons;

    public value: string;
    public confirm: string;

    _passwordControl: FormControl;
    _blur: boolean;
    _required: boolean;
    _minlength: boolean;
    _hasDigit: boolean;
    _hasSymbol: boolean;
    _hasLowerCase: boolean;
    _hasUpperCase: boolean;
    _hasConfirmed: boolean;

    @ViewChild('addons') addons: ElementRef<HTMLDivElement>;
    @ViewChild('passwordInput') passwordInput: ElementRef<HTMLInputElement>;

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    public onTouchedCallback = (): void => {
    };

    private onChangeCallback = (_: string): void => {
    };

    // validates the form, returns null when valid else the validation object
    public validate(c: FormControl<string>): ValidationErrors | null {
        this._passwordControl = c;
        // internal validations (validation msgs)
        this._required = !c.value;
        this._minlength = c.value ? c.value?.length < credentialsValidation.passwordRequirements.minLength : true;
        this._hasDigit = c.value ? new RegExp('[0-9]+').test(c.value) : false;
        this._hasSymbol = c.value ? new RegExp('[!@#\$%\^&\*\(\)_\+-]+').test(c.value) : false;
        this._hasLowerCase = c.value ? new RegExp('[a-z]+').test(c.value) : false;
        this._hasUpperCase = c.value ? new RegExp('[A-Z]+').test(c.value) : false;
        this._hasConfirmed = this.confirmation ? c.value ? c.value === this.confirm : false : true;

        // external validations (FORM)
        if (this._required) {
            return {
                required: true
            };
        }

        // check pattern
        if (!(this._hasDigit && this._hasSymbol && this._hasLowerCase && this._hasUpperCase && this._hasConfirmed)) {
            return {
                invalid: true
            };
        }

        // check length
        if (this._minlength) {
            return {
                minlength: true
            };
        }

        return null; // valid
    }

    constructor(
        configService: NxConfigService,
        private popoverService: NxPopoverService,
        private _viewContainerRef: ViewContainerRef,
        private api: NxCloudApiService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    checkConfirmed(): void {
        this._hasConfirmed = this.confirm === this.value;
        this._passwordControl.updateValueAndValidity();
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

    setValue(): void {
        // update the form
        this.onChangeCallback(this.value);
        this.form.form.get(this.componentId).markAsUntouched();
    }

    ngOnDestroy(): void {
    }

    ngOnInit(): void {
        this.fairPassword = true;
        this.passwordToggle = true;
        this.componentId = (this.componentId || 'generic');

        this.loadCommonPasswords(); // Load most common passwords
    }

    /**
     * Write a new (model) value to the element.
     */
    writeValue(value: string): void {
        this.value = value;
        if (value) {
            this.setValue();
        }
    }

    /**
     * Set the function to be called
     * when the control receives a change event.
     */
    registerOnChange(fn: () => void): void {
        this.onChangeCallback = fn;
    }

    /**
     * Set the function to be called
     * when the control receives a touch event.
     */
    registerOnTouched(fn: () => void): void {
        this.onTouchedCallback = fn;
    }

    onBlur(): void {
        this._blur = true;
        this.closeLegend();
        this.onTouchedCallback();
    }

    onBlurConfirmed(): void {
        this._blur = true;
        this.checkConfirmed();
    }

    showLegend(template: TemplateRef<unknown>, target: HTMLElement): void {
        if (!this.validation) {
            return;
        }
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'validation-popover',
                arrowOffset: 4,
                positionStrategy: POS_STRATEGY.TOP
            },
            this._viewContainerRef);
    }

    closeLegend(): void {
        this.popoverService.close();
    }
}
