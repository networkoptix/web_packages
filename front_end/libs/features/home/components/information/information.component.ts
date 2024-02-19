import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, isEqual } from 'lodash-es';

import { NxApplyComponent } from '@components/applyV2/apply.component';
import { NxButtonComponent } from '@components/button/button.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPagePlaceholderV2Component } from '@components/placeholders/pageV2/page-placeholder.component';
import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxValidators } from '@libs/validators/input-validators';
import { NxInfoGroupComponent } from '@pages/home/components/information/info-form/info-form.component';
import {
    ControlRow,
    CPInfoDataEvent,
    CPInfoType,
} from '@pages/home/components/information/information.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentPartnerId,
    selectCurrentPartnerInfo,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
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
        NxPagePlaceholderV2Component,
        NxInfoGroupComponent,
        NxApplyComponent,
    ],
})
export class NxChannelPartnerInformationComponent {
    protected readonly CPInfoType = CPInfoType;
    protected readonly PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;

    icons = icons;

    hasChanges: boolean = false;
    allValid: boolean = true;

    informationData: SupportInformation;
    hasInformation = false;
    information: SupportInformation = {
        phones: [],
        emails: [],
        sites: [],
        custom: [],
    };

    siteValidators: Array<ValidationErrors | null | ValidatorFn> = [
        Validators.required,
        this.nxValidators.URL(),
    ];
    phoneValidators: Array<ValidationErrors | null | ValidatorFn> = [
        Validators.required,
        this.nxValidators.phone(),
    ];
    emailValidators: Array<ValidationErrors | null | ValidatorFn> = [
        Validators.required,
        this.nxValidators.email(),
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
        custom: [],
    };

    mapInfoFor(type: string, psi: InfoDataServer[]): void {
        delete this.information[type];
        this.information[type] = [];

        psi.forEach((item: InfoDataServer | ControlRow) => {
            let value: string;
            let description: string;

            if (type === 'custom') {
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

            if (type === 'sites') {
                delete newItem.description;
            }

            this.information[type].push(newItem);
        });
    }

    mapPartnerSupportInfo(psi: SupportInformationSever): void {
        if (psi) {
            ['sites', 'phones', 'emails', 'custom'].forEach(type => {
                this.mapInfoFor(type, psi[type]);
                this.hasInformation ||= psi[type].length;
            });
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
            sites: this.formToServerData('sites'),
            emails: this.formToServerData('emails'),
            phones: this.formToServerData('phones'),
            custom: this.formCustomToServerData(),
        };
    }

    saveDataChanges = (): void => {
        // const test = this.mapDataToServer();
        this.cpService
            .updateChannelPartner(this.currPartnerId$$(), {
                supportInformation: this.mapDataToServer(),
            })
            .subscribe({
                next: () => {
                    this.hasChanges = false;
                    this.informationData = cloneDeep(this.information);
                },
                error: err => {
                    const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                    this.toastService.notify(msg, ToastType.Danger);
                },
            });
    };

    currPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    currPartnerSupportInfo$$ = this.store.selectSignal(selectCurrentPartnerInfo);
    currSupportInfoEffect = effect(() => {
        this.mapPartnerSupportInfo(this.currPartnerSupportInfo$$());
        this.informationData = cloneDeep(this.information);
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

    addRecordTo(type: CPInfoType): void {
        let target: string = '';
        let description: string | undefined = '';
        let validators: Array<ValidationErrors | null | ValidatorFn> = [];

        switch (type) {
            case CPInfoType.URL:
                target = 'sites';
                validators = this.siteValidators;
                description = undefined;
                break;
            case CPInfoType.PHONE:
                target = 'phones';
                validators = this.phoneValidators;
                break;
            case CPInfoType.EMAIL:
                target = 'emails';
                validators = this.emailValidators;
                break;
            case CPInfoType.CUSTOM:
                target = 'custom';
                validators = [];
                break;
        }

        const data = [...this.information[target]];
        const newRecord: InfoRow = {
            data: {
                value: '',
                validation: validators,
            },
        };

        if (description) {
            newRecord.description.value = description;
        }

        data.push(newRecord); // = { ...this.information, [target]: newTargetArray };
        this.information[target] = [...data];
        this.hasChanges = true;
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
    };
}
