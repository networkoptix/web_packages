import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, input, signal } from '@angular/core';
import { ValidationErrors, ValidatorFn } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, isEqual } from 'lodash-es';
import { firstValueFrom } from 'rxjs';

import {
    selectCurrentPartnerId,
    selectCurrentParentPartnerForChild,
    selectCurrentPartnerSupportInfo,
    selectCurrentPartner,
} from '@common/store/channel-partners/channel-partners.selectors';
import { NxApplyBackComponent } from '@components/applyV2/apply-back/apply.component';
import { NxApplyComponent } from '@components/applyV2/apply.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPagePlaceholderNoInfoComponent } from '@components/placeholdersV2/page/no-info/page-placeholder.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { createAsyncAction } from '@dialogs/async-action-button/create-async-action';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxValidators } from '@libs/validators/input-validators';
import { NxInfoGroupComponent } from '@pages/home/components/information/info-form/info-form.component';
import {
    ControlRow,
    CPInfoDataEvent,
    CPInfoType,
    InfoRow,
    SupportInformation,
} from '@pages/home/components/information/information.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CustomRowServer,
    InfoDataServer,
    InfoRowServer,
    SupportInformationServer,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';
import * as cpActions from '@store/channel-partners/channel-partners.actions';

/** @deprecated */
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
        NxInfoGroupComponent,
        NxApplyComponent,
        TranslateModule,
        NxPagePlaceholderNoInfoComponent,
        NxApplyBackComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class NxChannelPartnerInformationComponent {
    readOnlyInfo$$ = input<boolean>(false, {
        alias: 'readOnlyInfo',
    });

    protected readonly CPInfoType = CPInfoType;
    protected readonly icons = icons;

    hasDirty: boolean = false;
    hasNoItems: boolean = false;
    hasChanges: boolean = false;
    allValid: boolean = true;
    parentName: string = '';

    information: SupportInformation = {
        phones: [],
        emails: [],
        sites: [],
        custom: [],
    };
    informationData: SupportInformation = {
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

    mapInfoFor(type: CPInfoType, psi: InfoDataServer[]): void {
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

    mapPartnerSupportInfo(psi: SupportInformationServer | undefined): void {
        if (!psi) {
            return;
        }

        [CPInfoType.URL, CPInfoType.PHONE, CPInfoType.EMAIL, CPInfoType.CUSTOM].forEach(type => {
            this.mapInfoFor(type, psi[type]);
            this.hasNoItems &&= !(psi[type].length > 0);
        });
        this.parentName = this.currParentSupportInfo$$()?.name || '';
    }

    formToServerData(type: CPInfoType): InfoRowServer[] {
        const serverData: InfoRowServer[] = [];
        this.information[type].map(({ data, description }): number =>
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

    mapDataToServer(): SupportInformationServer {
        return {
            sites: this.formToServerData(CPInfoType.URL),
            emails: this.formToServerData(CPInfoType.EMAIL),
            phones: this.formToServerData(CPInfoType.PHONE),
            custom: this.formCustomToServerData(),
        };
    }

    currPartnerId$$ = this.store.selectSignal(selectCurrentPartnerId);
    currPartner$$ = this.store.selectSignal(selectCurrentPartner);
    currParentSupportInfo$$ = this.store.selectSignal(selectCurrentParentPartnerForChild);

    currSupportInfoEffect = effect(() => {
        this.currPartnerId$$();
        const info = this.readOnlyInfo$$()
            ? this.currParentSupportInfo$$()?.supportInformation
            : this.currentPartnerSupportInformation$$() || this.currPartner$$()?.supportInformation;

        this.mapPartnerSupportInfo(info);

        this.informationData = cloneDeep(this.information);
        this.hasNoItems = this.noItems();
    });

    currentPartnerSupportInformation$$ = this.store.selectSignal(selectCurrentPartnerSupportInfo);
    currentPartnerSupportInformationEffect = effect(() => {
        this.mapPartnerSupportInfo(this.currentPartnerSupportInformation$$());
    });

    editMode: boolean = false;

    busy$$ = signal(false);
    get busy(): boolean {
        return this.busy$$();
    }
    set busy(state: boolean) {
        this.busy$$.set(state);
    }

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

    addRecordTo(type: CPInfoType): void {
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

        this.mapInfoFor(formId as CPInfoType, formData);
        this.validForms[formId] = status;

        this.hasChanges = !isEqual(this.informationData, this.information);
        this.allValid = !Object.values(this.validForms).some(item => !item);
    }

    saveDataChanges = createAsyncAction({
        action: () => {
            return firstValueFrom(
                this.cpService.updateChannelPartner(this.currPartnerId$$(), {
                    supportInformation: this.mapDataToServer(),
                }),
            );
        },
        success: user => {
            this.hasChanges = false;
            this.hasDirty = false;
            this.hasNoItems = this.noItems();

            if (!this.hasNoItems) {
                this.editMode = false;
            }

            this.informationData = cloneDeep(this.information);
            this.store.dispatch(
                cpActions.setCurrentPartnerSupportInfo({
                    currentPartnerSupportInfo: this.mapDataToServer(),
                }),
            );
        },
        error: (err: HttpErrorResponse) => {
            // @ts-expect-error type error
            const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
            this.toastService.notify(msg, ToastType.Danger);
        },
    });

    discardDataChanges = (): void => {
        this.information = cloneDeep(this.informationData);
        this.hasChanges = false;
        this.allValid = true;

        [CPInfoType.URL, CPInfoType.PHONE, CPInfoType.EMAIL, CPInfoType.CUSTOM].forEach(type => {
            this.validForms[type] = true;
        });

        this.hasNoItems = this.noItems();
        // if change was canceled prior and no items in form - exit edit mode
        // button is having different caption per action
        // "Cancel" if form is dirty
        // "Back" if form is not dirty and no items
        if (this.hasNoItems || (this.editMode && this.hasDirty)) {
            this.hasDirty = false;
        }
        this.editMode = false;
    };
}
