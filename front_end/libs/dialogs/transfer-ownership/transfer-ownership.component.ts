import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, Inject, computed, signal, forwardRef } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { firstValueFrom } from 'rxjs';

import { NxAutocompleteComponent } from '@components/autocomplete/autocomplete.component';
import { NxSearchableDropdown } from '@components/dropdowns/searchable/searchable.component';
import type { SearchableDropdownItem } from '@components/dropdowns/searchable/searchable.component.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxRadioComponent } from '@components/radio/radio.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ModalBase } from '@dialogs/modal-base';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CloudSystem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { UserType } from '@services/system-user.types';
import { NxToastService } from '@services/toast.service';
import { icons, servers } from '@static-variables';

import type { TransferOwnership as DT } from '../dialogs.types';

import { NxTransferStepperComponent } from './transfer-stepper/transfer-stepper.component';
type OrgItem = SearchableDropdownItem;

@Component({
    selector: 'nx-modal-transfer-ownership-content',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        forwardRef(() => NxTransferStepperComponent),
        CdkStepperModule,
        AngularSvgIconModule,
        TranslateModule,
        NgxTranslateCutModule,
        LetDirective,
        NxSearchableDropdown,
        NxAutocompleteComponent,
        NxRadioComponent,
        NxPreLoaderComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxAddSvgSrcDirective,
    ],
})
export class TransferOwnershipModalContent extends ModalBase<DT['return']> implements OnInit {
    @ViewChild('transferOwnershipForm') private form: NgForm;

    selectedIndex: number = 0;

    LANG = staticLang;
    icons = icons;

    channelPartnersEnabled: boolean | null = null;

    currentOwnerType: 'user' | 'org' = 'user'; // Transferring from orgs not supported in V1
    transferInfo: SystemTransferInfo | CloudSystem;
    hideErrors: boolean = false;
    transferToUser: Process;
    transferToOrg: Process;

    userSearch: string = '';
    userEmails = new Set<string>();
    userEmails$$ = signal<string[] | null>(null);
    usersInSystem$$ = computed<boolean>(() => !!this.userEmails$$()?.length);

    orgItems$$ = signal<OrgItem[] | null>(null);
    selectedOrg: OrgItem;
    isOrgMember$$ = computed<boolean>(() => !!this.orgItems$$()?.length);

    newOwner: string = '';

    transferTargetType$$ = signal<'user' | 'org'>('user');

    advanceProcess = this.processService.createProcess(() => {
        this.newOwner =
            this.transferTargetType$$() === 'user' ? this.userSearch : this.selectedOrg.name;
        this.selectedIndex += 1;
        return Promise.resolve();
    });

    constructor(
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        private toastService: NxToastService,
        private dialogService: NxDialogsService,
        private partnersService: NxChannelPartnersService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        const items: string[] = [];
        this.system.userManager.users.forEach(user => {
            if (user.type === UserType.cloud && !user.isOwner && user.isEnabled) {
                this.userEmails.add(user.email);
                items.push(user.email);
            }
        });
        this.userEmails$$.set(items);

        this.channelPartnersEnabled = !!(
            this.system.version > 5.1 && nxConfig.featureFlags.channelPartners
        );
        if (this.channelPartnersEnabled) {
            this.partnersService.getOrganizations(true).subscribe(orgs => {
                const items = orgs.reduce((orgs, org) => {
                    if (org.ownPermissions.includes('manage_systems')) {
                        orgs.push({
                            name: org.name,
                            value: org.id,
                        });
                    }
                    return orgs;
                }, [] as OrgItem[]);
                if (items.length) {
                    this.transferTargetType$$.set('org');
                }
                this.orgItems$$.set(items);
            });
        }

        const errorCodes = {
            userDisabled: () => {
                this.form.control.setErrors({
                    userDisabled: true,
                });
            },
            userNotFound: () => {
                this.form.control.setErrors({
                    userNotFound: true,
                });
            },
        };

        this.transferToUser = this.processService.createProcess(
            async () => {
                this.lock();
                return firstValueFrom(
                    this.cloudService.startTransfer(this.system.id, this.userSearch),
                );
            },
            { errorCodes, ignoreError: true },
            async (res: SystemTransferInfo) => {
                this.transferInfo = res;
                this.selectedIndex += 1;
                this.unlock();
            },
            err => {
                if (
                    err?.resultCode === servers.errors.userPasswordRequired ||
                    err.errorId === servers.errors.oldSessionErrorId
                ) {
                    this.toastService.notify(
                        this.LANG.dialogs.updateSession.transferOnwership,
                        ToastType.Warning,
                    );
                }
                this.unlock();
            },
        );

        this.transferToOrg = this.processService.createProcess(
            async () => {
                this.lock();
                const orgId = this.selectedOrg.value;
                return firstValueFrom(
                    this.partnersService.transferSystemToOrg(orgId, this.system.id),
                );
            },
            { errorCodes, ignoreError: true },
            async (res: CloudSystem) => {
                this.transferInfo = res;
                this.selectedIndex += 1;
                this.unlock();
            },
            err => {
                if (
                    err?.resultCode === servers.errors.userPasswordRequired ||
                    err.errorId === servers.errors.oldSessionErrorId
                ) {
                    this.toastService.notify(
                        this.LANG.dialogs.updateSession.transferOnwership,
                        ToastType.Warning,
                    );
                }
                this.unlock();
            },
        );
    }

    selectUser(value: string): void {
        if (value === this.userSearch) {
            return;
        }
        this.userSearch = value;
        this.form.control.setErrors(null);
        if (value !== '' && !this.userEmails.has(value)) {
            this.form.control.setErrors({ userNotFound: true });
        }
    }

    selectOrg(org: OrgItem): void {
        if (org.value !== this.selectedOrg?.value) {
            this.form.control.setErrors(null);
        }
        this.selectedOrg = { ...org };
    }

    checkOrg(input: string): void {
        if (input !== '' && !this.orgItems$$()?.some(el => el.name === input)) {
            this.form.control.setErrors({ orgNotFound: true });
        }
    }

    openAddUserDialog(): void {
        this.dialogRef.close();
        this.dialogService.addUser(this.system);
    }
}
