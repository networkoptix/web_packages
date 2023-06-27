import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import type {
    SearchableDropdownItem
} from '@components/dropdowns/searchable/searchable.component.types';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { ModalBase } from '@dialogs/modal-base';
import { icons, servers } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

import type { TransferOwnership as DT } from '../dialogs.types';

interface UserItem extends SearchableDropdownItem {
    userEnabled: boolean;
}

@Component({
    selector: 'nx-modal-transfer-ownership-content',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss'],
})
export class TransferOwnershipModalContent extends ModalBase<DT['return']> implements OnInit {
    @ViewChild('transferOwnershipForm') form: NgForm;

    LANG = staticLang;

    transferInfo: SystemTransferInfo;
    transferComplete: boolean = false;
    hideErrors: boolean = false;
    transferOwnership: Process;

    userItems: UserItem[];
    selectedUser: UserItem;
    icons = icons;

    constructor(
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        private toastService: NxToastService,
        private dialogService: NxDialogsService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        this.userItems = this.system.userManager.nonOwners({ cloud: true })
            .map(user => ({
                name: user.email,
                value: user.email,
                help: user.fullName,
                userEnabled: user.isEnabled,
            }));

        const errorCodes = {
            userDisabled: () => {
                this.form.control.setErrors({
                    userDisabled: true
                });
            },
            userNotFound: () => {
                this.form.control.setErrors({
                    userNotFound: true
                });
            },
        };

        this.transferOwnership = this.processService.createProcess(
            async () => {
                this.lock();
                const newOwnerEmail = this.selectedUser.value;
                return firstValueFrom(
                    this.cloudService.startTransfer(this.system.id, newOwnerEmail)
                );
            },
            { errorCodes, ignoreError: true },
            (res: SystemTransferInfo) => {
                this.unlock();
                this.transferComplete = true;
                this.transferInfo = res;
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
        if (!user.userEnabled) {
            this.form.control.setErrors({ userDisabled: true });
        }
        if (!user.value) {
            this.form.control.setErrors({ userDisabled: false });
        }
        this.selectedUser = { ...user };
    }

    checkUser(input: string): void {
        if (input !== '' && !this.userItems.some(el => el.value === input)) {
            this.form.control.setErrors({ userNotFound: true });
        }
    }

    openAddUserDialog(): void {
        this.dialogRef.close();
        this.dialogService.addUser(this.system);
    }
}
