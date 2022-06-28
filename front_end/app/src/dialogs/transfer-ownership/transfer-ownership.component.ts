import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { isEqual } from 'lodash-es';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-transfer-ownership-content',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss']
})
export class TransferOwnershipModalContent implements OnInit {
    system: NxSystem;
    transfers: SystemTransferInfo[];
    closable: boolean = true;

    @ViewChild('transferOwnershipForm') form: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    transferComplete: boolean = false;
    hideErrors: boolean = false;
    transferOwnership: Process;

    userItems: DropdownItem<string>[];
    selectedUser: DropdownItem<string>;

    get noUsers(): boolean {
        return !this.userItems?.length;
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem,
            transfers: SystemTransferInfo[],
        },
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        pickFrom(this.dialogData, ['system', 'transfers'], this);
    }

    ngOnInit(): void {
        this.userItems = this.system.userManager.users
            .filter(user =>
                user.email && // Discard local admin
                user.email !== this.system.userManager.currentOwner.email
                // Discard system owner
            )
            .map(user => ({
                name: user.email,
                value: user.email,
                help: user.fullName,
            }));
        this.selectedUser = this.userItems?.[0];

        const errorCodes = {
            duplicateTransfer: () => {
                this.form.control.setErrors({
                    duplicateTransfer: true
                });
            },
        };

        this.transferOwnership = this.processService.createProcess(
            async () => {
                const newOwnerEmail = this.selectedUser.value;

                if (this.transfers.some(t => t.toAccount === newOwnerEmail)) {
                    return Promise.reject({ error: 'duplicateTransfer' });
                }

                return this.cloudService
                    .startTransfer(this.system.id, newOwnerEmail)
                    .toPromise();
            },
            { errorCodes },
            (res: SystemTransferInfo) => {
                this.transferComplete = true;
                this.transfers.push(res);
            },
            () => {},
        );
    }

    selectUser(user: DropdownItem<string>): void {
        if (!isEqual(user, this.selectedUser)) {
            this.form.control.setErrors(null);
        }
        this.selectedUser = { ...user };
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
