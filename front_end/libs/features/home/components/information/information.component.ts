import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, forwardRef } from '@angular/core';
import {
    FormArray,
    FormControl,
    FormGroup,
    NonNullableFormBuilder,
    ReactiveFormsModule,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { capitalize, chunk, memoize, zipObject } from 'lodash-es';
import { v4 as uuid } from 'uuid';

import { NxApplyV3Module } from '@components/forms/apply-v3/apply-v3.module';
import { NxFormResetFn } from '@components/forms/apply-v3/apply-v3.types';
import { NxResetButtonComponent } from '@components/forms/buttons/reset-button/reset-button.component';
import {
    errorMatcherFactory,
    NX_BASE_ERROR_MATCHES,
} from '@components/forms/form-field/error-state-matcher';
import { NxFormFieldModule } from '@components/forms/forms.module';
import { NxInputComponent } from '@components/forms/input/input.component';
import { NxValidators } from '@components/forms/validators';
import { NxPagePlaceholderGenericComponent } from '@components/placeholdersV2/generic-page-placeholder.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import LANG from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    SupportInfoItem,
    SupportInformation,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';
import { patchPartner } from '@store/channel-partners/channel-partners.actions';
import { selectCurrentPartner } from '@store/channel-partners/channel-partners.selectors';
import { keyValueNoSort } from '@utils/nx';

import { NxInformationStepperComponent } from './information-stepper.component';
import { NxInformationViewComponent } from './information-view/information-view.component';

const NON_NUMBERS_REGEX = /[^0-9]/g;
const removeNonNumbers = memoize((text: string): string => {
    return text.replace(NON_NUMBERS_REGEX, '');
});

function uniqueWhitespace(text: string): string {
    return !text.trim() ? uuid() : text;
}

const infoTranslations = LANG.channelPartners.supportInformation;

type NewControlFn = (initial: string) => FormControl<string>;
type StringControlArray = FormArray<FormControl<string>>;

function nonEmptyInformation(information: SupportInformation): boolean {
    return Object.values(information).some((info: object[]) => info.length);
}

enum Steps {
    Empty = 0,
    View = 1,
    Edit = 2,
}

@Component({
    selector: 'nx-information',
    templateUrl: 'information.component.html',
    styleUrls: ['information.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        CdkStepperModule,
        ReactiveFormsModule,

        AngularSvgIconModule,
        LetDirective,
        TranslateModule,

        PipesModule,
        forwardRef(() => NxInformationStepperComponent),
        NxPagePlaceholderGenericComponent,
        NxInformationViewComponent,
        NxFormFieldModule,
        NxInputComponent,
        NxApplyV3Module,
        NxResetButtonComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxInformationComponent {
    icons = icons;
    noSort = keyValueNoSort;

    stepIndex = Steps.Empty;
    toEmptyStep(): void {
        this.stepIndex = Steps.Empty;
    }
    toViewStep(): void {
        this.stepIndex = Steps.View;
    }
    toEditStep(): void {
        this.stepIndex = Steps.Edit;
    }

    private channelPartner = computed(() => this.store.selectSignal(selectCurrentPartner)()!);
    information = computed<SupportInformation>(() => this.channelPartner().supportInformation);
    hasInfo = computed<boolean>(() => nonEmptyInformation(this.information()));

    formGroup = new FormGroup({
        sites: new FormArray<FormControl<string>>([]),
        phones: new FormArray<FormControl<string>>([]),
        emails: new FormArray<FormControl<string>>([]),
        custom: new FormArray<FormControl<string>>([]),
    });
    initialFormValue: Record<string, unknown> = this.formGroup.getRawValue();

    constructor(
        private store: Store,
        private cpService: NxChannelPartnersService,
        private formBuilder: NonNullableFormBuilder,
    ) {
        if (this.hasInfo()) {
            this.toViewStep();
            this.initializeForm();
        }
    }

    private initializeForm(): void {
        const sites = new FormArray(
            this.information().sites.map(site => this.newSiteControl(site.value)),
            {
                validators: [
                    NxValidators.uniqueArrayValues<string>({
                        transformFn: uniqueWhitespace,
                    }),
                ],
            },
        );
        this.formGroup.setControl('sites', sites);

        const phones = new FormArray(
            this.information().phones.flatMap(phone => [
                this.newPhoneControl(phone.value),
                this.newOptionalTextControl(phone.description),
            ]),
            {
                validators: [
                    NxValidators.uniqueArrayValues<string>({
                        transformFn: v => (!v.trim() ? uuid() : removeNonNumbers(v)),
                        filterFn: (_, i) => !(i % 2),
                    }),
                ],
            },
        );
        this.formGroup.setControl('phones', phones);

        const emails = new FormArray(
            this.information().emails.flatMap(email => [
                this.newEmailControl(email.value),
                this.newOptionalTextControl(email.description),
            ]),
            {
                validators: [
                    NxValidators.uniqueArrayValues<string>({
                        transformFn: uniqueWhitespace,
                        filterFn: (_, i) => !(i % 2),
                    }),
                ],
            },
        );
        this.formGroup.setControl('emails', emails);

        const custom = new FormArray(
            this.information().custom.flatMap(custom => [
                this.newCustomLabelControl(custom.label),
                this.newCustomValueControl(custom.value),
            ]),
            {
                validators: [
                    NxValidators.uniqueArrayValues<string>({
                        transformFn: uniqueWhitespace,
                        filterFn: (_, i) => !(i % 2),
                    }),
                ],
            },
        );
        this.formGroup.setControl('custom', custom);

        this.initialFormValue = this.formGroup.getRawValue();
    }

    controlIds = new WeakMap<FormControl<string>, string>();
    private newControlFnFactory = (validators: () => ValidatorFn[]): NewControlFn => {
        return initial => {
            const control = this.formBuilder.control(initial, { validators: validators() });
            this.controlIds.set(control, uuid());
            return control;
        };
    };
    private newSiteControl = this.newControlFnFactory(NxValidators.url);
    private newPhoneControl = this.newControlFnFactory(NxValidators.phone);
    private newEmailControl = this.newControlFnFactory(NxValidators.email);
    private newCustomLabelControl = this.newControlFnFactory(() => [
        ...NxValidators.text(),
        Validators.pattern(/^[\p{L} ]*$/u), // Letters and spaces
    ]);
    private newCustomValueControl = this.newControlFnFactory(() => [
        ...NxValidators.text(),
        Validators.pattern(/^[\p{L}\d ]*$/u), // Letters, numbers, and spaces
    ]);
    private newOptionalTextControl = this.newControlFnFactory(() => NxValidators.text(false));
    private addFnFactory = (
        key: keyof (typeof this.formGroup)['controls'],
        primaryControlFn: NewControlFn,
        secondaryControlFn?: NewControlFn,
    ): (() => void) => {
        return () => {
            const formArray = this.formGroup.controls[key];
            formArray.push(primaryControlFn(''));
            if (secondaryControlFn) {
                formArray.push(secondaryControlFn(''));
            }
        };
    };
    private deleteFnFactory = (
        key: keyof (typeof this.formGroup)['controls'],
        double = true,
    ): ((i: number) => void) => {
        return i => {
            const formArray = this.formGroup.controls[key];
            if (double) {
                formArray.removeAt(i + 1);
            }
            formArray.removeAt(i);
        };
    };

    get sitesFormArray(): StringControlArray {
        return this.formGroup.controls.sites;
    }
    addSites = this.addFnFactory('sites', this.newSiteControl);
    deleteSites = this.deleteFnFactory('sites', false);

    private addPhones = this.addFnFactory(
        'phones',
        this.newPhoneControl,
        this.newOptionalTextControl,
    );

    private get emailsFormArray(): StringControlArray {
        return this.formGroup.controls.emails;
    }
    private addEmails = this.addFnFactory(
        'emails',
        this.newEmailControl,
        this.newOptionalTextControl,
    );

    private get customFormArray(): StringControlArray {
        return this.formGroup.controls.custom;
    }
    private addCustom = this.addFnFactory(
        'custom',
        this.newCustomLabelControl,
        this.newCustomValueControl,
    );

    primaryErrorMatcher = errorMatcherFactory(NX_BASE_ERROR_MATCHES, {
        onSubmit: ['uniqueArrayValue'],
    });
    secondaryErrorMatcher = errorMatcherFactory();

    private doubleKeys = ['phones', 'emails', 'custom'] as const;
    DoubleKeyType!: (typeof this.doubleKeys)[number];
    addFunctions = zipObject(
        this.doubleKeys,
        this.doubleKeys.map(k => this[`add${capitalize(k) as Capitalize<typeof k>}`]),
    );
    deleteFunctions = zipObject(
        this.doubleKeys,
        this.doubleKeys.map(k => this.deleteFnFactory(k)),
    );
    headers = infoTranslations.editHeader;
    primaryLabels = infoTranslations.editPrimaryLabel;
    uniqueError = infoTranslations.uniqueError;
    secondaryLabels = infoTranslations.editSecondaryLabel;
    emptyText = infoTranslations.emptyText;
    doubleSections = {
        phones: {
            primary: {
                type: 'tel' as const,
                messages: [{ key: 'uniqueArrayValue', text: this.uniqueError.phones }],
            },
            secondary: { messages: [] },
        },
        emails: {
            primary: {
                type: 'email' as const,
                messages: [{ key: 'uniqueArrayValue', text: this.uniqueError.emails }],
            },
            secondary: { messages: [] },
        },
        custom: {
            primary: {
                type: '' as const,
                messages: [
                    { key: 'required', text: infoTranslations.labelRequired },
                    { key: 'uniqueArrayValue', text: this.uniqueError.custom },
                    { key: 'pattern', text: infoTranslations.labelPattern },
                ],
            },
            secondary: {
                type: '' as const,
                messages: [
                    { key: 'required', text: infoTranslations.valueRquired },
                    { key: 'pattern', text: infoTranslations.valuePattern },
                ],
            },
        },
    };

    private doubleFormArrayToApiArray(formArray: StringControlArray): SupportInfoItem[] {
        return chunk(formArray.value, 2).map(([value, description]) => ({ value, description }));
    }

    saveInfoAction = createAsyncAction({
        action: () => {
            const sites = this.sitesFormArray.value.map(value => ({ value, description: '' }));
            const phones = this.doubleFormArrayToApiArray(this.formGroup.controls.phones);
            const emails = this.doubleFormArrayToApiArray(this.emailsFormArray);
            const custom = chunk(this.customFormArray.value, 2).map(([label, value]) => ({
                label,
                value,
            }));
            return this.cpService.updateChannelPartner(this.channelPartner().id, {
                supportInformation: { sites, phones, emails, custom },
            });
        },
        success: patch => {
            this.store.dispatch(patchPartner({ patch }));
            const { supportInformation } = patch;
            if (nonEmptyInformation(supportInformation)) {
                this.toViewStep();
            } else {
                this.toEmptyStep();
            }
        },
    });

    reset: NxFormResetFn = observer => {
        this.initializeForm();
        observer.reset();
    };

    back: NxFormResetFn = observer => {
        if (this.hasInfo()) {
            this.toViewStep();
        } else {
            this.toEmptyStep();
        }
        this.reset(observer);
    };

    protected _dummyControl = new FormControl('');
    protected _dummyControlEffect = effect(() => {
        this._dummyControl.disable();
    });
}
