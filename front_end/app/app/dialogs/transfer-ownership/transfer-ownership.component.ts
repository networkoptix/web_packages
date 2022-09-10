import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type {
    SearchableDropdownItem
} from '@components/dropdowns/searchable/searchable.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxLoginService } from '@services/login.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';

interface UserItem extends SearchableDropdownItem {
    userEnabled: boolean;
}

@Component({
    selector: 'nx-modal-transfer-ownership-content',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss']
})
export class TransferOwnershipModalContent implements OnInit {
    system: NxSystem;
    closable: boolean = true;

    @ViewChild('transferOwnershipForm') form: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    transferInfo: SystemTransferInfo;
    transferComplete: boolean = false;
    hideErrors: boolean = false;
    transferOwnership: Process;
    updateSession: boolean = false;

    userItems: UserItem[];
    selectedUser: UserItem;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        private loginService: NxLoginService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem,
        },
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.system = this.dialogData.system;
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
                const newOwnerEmail = this.selectedUser.value;
                return this.cloudService
                    .startTransfer(this.system.id, newOwnerEmail)
                    .toPromise();
            },
            { errorCodes, ignoreError: true },
            (res: SystemTransferInfo) => {
                this.transferComplete = true;
                this.transferInfo = res;
            },
            err => {
                if (err?.resultCode === 'userPasswordRequired' || err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                    this.updateSession = true;
                    this.loginService.currentSystem = this.system;
                    this.loginService.updateSession('transfer')
                        .then(ready => {
                            this.updateSession = !ready;
                        });
                }
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

    close = (info?: SystemTransferInfo): void => {
        this.dialogRef.close(info);
    };
}
