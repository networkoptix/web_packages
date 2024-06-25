import { CommonModule } from '@angular/common';
import { Component, effect, input } from '@angular/core';
import { ValidationErrors, ValidatorFn } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, isEqual } from 'lodash-es';

import {
    selectCurrentPartnerId,
    selectCurrentPartnerInfo,
    selectCurrentParentPartnerForChild,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxApplyBackComponent } from '@components/applyV2/apply-back/apply.component';
import { NxApplyComponent } from '@components/applyV2/apply.component';
import { NxButtonComponent } from '@components/button/button.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPagePlaceholderNoInfoComponent } from '@components/placeholdersV2/page/no-info/page-placeholder.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxValidators } from '@libs/validators/input-validators';
import { NxInfoGroupComponent } from '@pages/home/components/information/info-form/info-form.component';
import {
    ControlRow,
    CPInfoDataEvent,
    CPInfoType,
} from '@pages/home/components/information/information.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CustomRowServer,
    InfoDataServer,
    InfoRow,
    InfoRowServer,
    SupportInformation,
    SupportInformationSever,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-channel-partner-information',
    templateUrl: 'information.component.html',
    styleUrls: ['information.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxAddSvgSrcDirective,
        NxButtonComponent,
        NxInfoGroupComponent,
        NxApplyComponent,
        TranslateModule,
        NxPagePlaceholderNoInfoComponent,
        NxApplyBackComponent,
    ],
})
export class NxChannelPartnerInformationComponent {
    // eslint-disable-next-line nx/signal-naming-convention
    readonlyInfo = input<boolean>(false, {
        alias: 'readonlyInfo',
    });

    protected readonly CPInfoType = CPInfoType;

    icons = icons;

    hasDirty: boolean = false;
    hasNoItems: boolean = false;
    hasChanges: boolean = false;
    allValid: boolean = true;

    informationData: SupportInformation;
    information: SupportInformation = {
        phones: [],
        emails: [],
        sites: [],
        custom: [],
    };

    siteValidators: Array<ValidationErrors | null | ValidatorFn> = [
        this.nxValidators.requiredURL(),
        this.nxValidators.URL(),
    ];
    phoneValidators: Array<ValidationErrors | null | ValidatorFn> = [
        this.nxValidators.requiredPhone(),
        this.nxValidators.phone(),
        this.nxValidators.uniqueNumber(),
    ];
    emailValidators: Array<ValidationErrors | null | ValidatorFn> = [
        this.nxValidators.requiredEmail(),
        this.nxValidators.email(),
    ];

    labelValidators: Array<ValidationErrors | null | ValidatorFn> = [
        this.nxValidators.requiredLabel(),
    ];

    valueValidators: Array<ValidationErrors | null | ValidatorFn> = [
        this.nxValidators.requiredValue(),
    ];

    validForms: Record<string, boolean> = {
        phones: true,
        emails: true,
        sites: true,
        custom: true,
    };

    validationType: Record<string, Array<ValidationErrors | null | ValidatorFn>> = {
        phones: this.phoneValidators,
        emails: this.emailValidators,
        sites: this.siteValidators,
        label: this.labelValidators,
        value: this.valueValidators,
    };

    mapInfoFor(type: string, psi: InfoDataServer[]): void {
        delete this.information[type];
        this.information[type] = [];

        psi.forEach((item: InfoDataServer | ControlRow) => {
            let value: string;
            let description: string;

            if (type === CPInfoType.CUSTOM) {
                value = (item as CustomRowServer).label || (item as ControlRow).data;
                description =
                    (item as CustomRowServer).value || (item as ControlRow).description || null;
            } else {
                value = (item as InfoRowServer).value || (item as ControlRow).data;
                description = (item as InfoRowServer).description;
            }

            const newItem: InfoRow = {
                data: {
                    value,
                    validation: this.validationType[type],
                },
                description: {
                    value: description,
                },
            };

            if (type === CPInfoType.URL) {
                delete newItem.description;
            }

            if (type === CPInfoType.CUSTOM) {
                newItem.data.validation = this.validationType.label;
                newItem.description.validation = this.validationType.value;
            }

            this.information[type].push(newItem);
        });
    }

    mapPartnerSupportInfo(psi: SupportInformationSever): void {
        if (psi) {
            [CPInfoType.URL, CPInfoType.PHONE, CPInfoType.EMAIL, CPInfoType.CUSTOM].forEach(
                type => {
                    this.mapInfoFor(type, psi[type]);
                    this.hasNoItems ||= psi[type].length > 0;
                },
            );
        }
    }

    formToServerData(formId: string): InfoRowServer[] {
        const serverData: InfoRowServer[] = [];
        this.information[formId].map(({ data, description }): number =>
            serverData.push({
                value: data.value,
                description: description?.value || '', // account for "sites"
            }),
        );
        return serverData;
    }

    formCustomToServerData(): CustomRowServer[] {
        const serverData: CustomRowServer[] = [];
        this.information.custom.map(({ data, description }): number =>
            serverData.push({
                label: data.value,
                value: description.value,
            }),
        );
        return serverData;
    }

    mapDataToServer(): SupportInformationSever {
        return {
            sites: this.formToServerData(CPInfoType.URL),
            emails: this.formToServerData(CPInfoType.EMAIL),
            phones: this.formToServerData(CPInfoType.PHONE),
            custom: this.formCustomToServerData(),
        };
    }

    saveDataChanges = (): void => {
        this.cpService
            .updateChannelPartner(this.currPartnerId$$(), {
                supportInformation: this.mapDataToServer(),
            })
            .subscribe({
                next: () => {
                    this.hasChanges = false;
                    this.hasDirty = false;
                    this.hasNoItems = this.noItems();

                    if (!this.hasNoItems) {
                        this.editMode = false;
                    }

                    this.informationData = cloneDeep(this.information);
                },
                error: err => {
                    const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                    this.toastService.notify(msg, ToastType.Danger);
                },
            });
    };

    currPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    currParentSupportInfo$$ = this.store.selectSignal(selectCurrentParentPartnerForChild);
    currPartnerSupportInfo$$ = this.store.selectSignal(selectCurrentPartnerInfo);
    currSupportInfoEffect = effect(() => {
        const parentInfo = this.currParentSupportInfo$$()?.supportInformation;
        const currentPartnerInfo = this.currPartnerSupportInfo$$();
        const info = this.readonlyInfo() ? parentInfo : currentPartnerInfo;
        if (info) {
            this.mapPartnerSupportInfo(info);
        }
        this.informationData = cloneDeep(this.information);
        this.hasNoItems = this.noItems();
    });

    editMode: boolean = false;

    constructor(
        private store: Store,
        private nxValidators: NxValidators,
        private cpService: NxChannelPartnersService,
        private toastService: NxToastService,
    ) {}

    editModeToggle = (): void => {
        this.editMode = !this.editMode;
    };

    noItems(): boolean {
        return !(
            this.information.custom.length ||
            this.information.emails.length ||
            this.information.phones.length ||
            this.information.sites.length
        );
    }

    addRecordTo(type: string): void {
        const data = [...this.information[type]];
        const newRecord: InfoRow = {
            data: {
                value: '',
                validation: this.validationType[type],
            },
            description: {
                value: '',
            },
        };

        if (type === CPInfoType.URL) {
            delete newRecord.description;
        }

        if (type === CPInfoType.CUSTOM) {
            newRecord.data.validation = this.validationType.label;
            newRecord.description.validation = this.validationType.value;
        }

        data.push(newRecord);
        this.information[type] = [...data];
        this.hasChanges = true;
        this.hasNoItems = false;
        this.allValid = false;
        this.validForms[type] = false;
    }

    updateFormState(pristine: boolean): void {
        this.hasDirty = !pristine;
    }

    updateData(e: CPInfoDataEvent): void {
        const { formId, formData, status } = e;

        this.mapInfoFor(formId, formData);
        this.validForms[formId] = status;

        this.hasChanges = !isEqual(this.informationData, this.information);
        this.allValid = !Object.values(this.validForms).some(item => !item);
    }

    discardDataChanges = (): void => {
        this.information = cloneDeep(this.informationData);
        this.hasChanges = false;
        this.allValid = true;

        [CPInfoType.URL, CPInfoType.PHONE, CPInfoType.EMAIL, CPInfoType.CUSTOM].forEach(type => {
            this.validForms[type] = true;
        });

        // if change was canceled prior and no items in form - exit edit mode
        // button is having different caption per action
        // "Cancel" if form is dirty
        // "Back" if form is not dirty and no items
        if (this.hasNoItems) {
            this.editMode = false;
            return;
        }

        this.hasNoItems = this.noItems();
    };
}
