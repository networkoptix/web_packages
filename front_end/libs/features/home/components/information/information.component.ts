import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, isEqual } from 'lodash-es';
import { firstValueFrom } from 'rxjs';

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
import { CPInfoDataEvent, CPInfoType } from '@pages/home/components/information/information.types';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import {
    selectCurrentPartnerId,
    selectCurrentPartnerInfo,
} from '@pages/home/store/channel-partners/channel-partners.selectors';
import {
    Custom,
    DataInfo,
    Email,
    InfoData,
    InfoRow,
    Phone,
    SupportInformation,
    SupportInformationSever,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';

const mockSystems = ['sys1', 'sys2', 'sys3', 'sys4', 'sys5'];

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

    hasChanges: boolean = false;
    allValid: boolean = true;
    updateInfoProcess: Process;

    informationData: SupportInformation;
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

    mapInfoFor(type: string, psi: InfoData[]): void {
        delete this.information[type];
        this.information[type] = [];

        psi.forEach((item: InfoData) => {
            const value =
                (item as Phone).phone ||
                (item as Email).email ||
                (item as Custom).label ||
                (item as DataInfo).data ||
                item;
            const descr = (item as DataInfo).description || (item as Custom).value || null;

            this.information[type].push({
                data: {
                    value,
                    validation: this.validationType[type],
                },
                description: {
                    value: descr,
                },
            });
        });
    }

    mapPartnerSupportInfo(psi: SupportInformationSever): void {
        ['sites', 'phones', 'emails', 'custom'].forEach(type => {
            this.mapInfoFor(type, psi[type]);
        });
    }

    protected readonly PAGE_PLACEHOLDER = PAGE_PLACEHOLDER;

    systems = mockSystems;
    icons = icons;

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
    ) {}

    ngOnInit(): void {}

    editModeToggle(): void {
        this.editMode = !this.editMode;
    }

    addRecordTo(type: CPInfoType): void {
        let target: string = '';
        let description: string | null = '';
        let validators: Array<ValidationErrors | null | ValidatorFn> = [];

        switch (type) {
            case CPInfoType.URL:
                target = 'sites';
                validators = this.siteValidators;
                description = null;
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
            description: { value: description },
        };

        data.push(newRecord); // = { ...this.information, [target]: newTargetArray };
        this.information[target] = [...data];
        this.hasChanges = true;
    }

    updateData(e: CPInfoDataEvent): void {
        const { formId, data, status } = e;

        this.mapInfoFor(formId, data);
        this.validForms[formId] = status;

        this.hasChanges = !isEqual(this.informationData, this.information);
        this.allValid = !Object.values(this.validForms).some(item => !item);
    }

    discardDataChanges = (): void => {
        this.information = cloneDeep(this.informationData);
        this.hasChanges = false;
    };

    saveDataChanges = (): void => {
        this.updateInfoProcess.run();
    };
}
