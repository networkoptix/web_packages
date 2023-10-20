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
import { firstValueFrom, map } from 'rxjs';

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
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { icons, servers } from '@static-variables';

import type { TransferOwnership as DT } from '../dialogs.types';

import { NxTransferStepperComponent } from './transfer-stepper/transfer-stepper.component';

interface UserItem extends SearchableDropdownItem {
    userEnabled: boolean;
}

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

    currentOwnerType: 'user' | 'org' = 'user'; // TODO: Add checks for this after CDB support
    transferInfo: SystemTransferInfo;
    hideErrors: boolean = false;
    transferToUser: Process;
    transferToOrg: Process;

    userItems$$ = signal<UserItem[]>(undefined);
    selectedUser: UserItem;
    usersInSystem$$ = computed<boolean>(() => !!this.userItems$$()?.length);

    orgItems$$ = signal<OrgItem[]>(undefined);
    selectedOrg: OrgItem;
    isOrgMember$$ = computed<boolean>(() => !!this.orgItems$$()?.length);

    newOwner: string;
    isOrgAdmin: boolean;

    transferTargetType$$ = signal<'user' | 'org'>('user');

    advanceProcess = this.processService.createProcess(() => {
        this.newOwner =
            this.transferTargetType$$() === 'user' ? this.selectedUser.name : this.selectedOrg.name;
        this.selectedIndex += 1;
        return Promise.resolve();
    });

    constructor(
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        private toastService: NxToastService,
        private dialogService: NxDialogsService,
        private partnersService: NxChannelPartnersService,
        private accountService: NxAccountService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        const items = this.system.userManager.nonOwners({ cloud: true }).map(user => ({
            name: user.email,
            value: user.email,
            help: user.fullName,
            userEnabled: user.isEnabled,
        }));
        this.userItems$$.set(items);

        this.partnersService.getOrganizations().subscribe(orgs => {
            const items = orgs.map(org => ({
                name: org.name,
                value: org.id,
            }));
            this.orgItems$$.set(items);
        });

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
                const newOwnerEmail = this.selectedUser.value;
                return firstValueFrom(
                    this.cloudService.startTransfer(this.system.id, newOwnerEmail),
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
                const transfer = Promise.resolve(); // TODO: No CDB support yet
                // const addToOrg = this.partnersService.bindSystemToOrg({
                //     cloudSystemId: this.system.id,
                //     organization: this.selectedOrg.value,
                // });
                // Add after transfer support is available
                const checkIfAdmin = new Promise<void>(resolve => {
                    this.partnersService
                        .getOrganizationUsers(this.selectedOrg.value)
                        .pipe(map(users => users.find(u => u.email === this.accountService.email)))
                        .subscribe(user => {
                            this.isOrgAdmin = user.roles.includes('Organization Administrator');
                            resolve();
                        });
                });
                return Promise.all([transfer, /* addToOrg, */ checkIfAdmin]);
            },
            { errorCodes, ignoreError: true },
            async (res: unknown) => {
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

    selectUser(user: UserItem): void {
        if (user.value !== this.selectedUser?.value) {
            this.form.control.setErrors(null);
        }
        if (!user.userEnabled && user.disabled === undefined) {
            // Not a "free type" user --TT
            this.form.control.setErrors({ userDisabled: true });
        }
        if (!user.value) {
            this.form.control.setErrors({ userDisabled: false });
        }
        this.checkUser(user.value);
        this.selectedUser = { ...user };
    }

    checkUser(input: string): void {
        if (input !== '' && !this.userItems$$().some(el => el.value === input)) {
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
        if (input !== '' && !this.orgItems$$().some(el => el.value === input)) {
            this.form.control.setErrors({ orgNotFound: true });
        }
    }

    openAddUserDialog(): void {
        this.dialogRef.close();
        this.dialogService.addUser(this.system);
    }
}
