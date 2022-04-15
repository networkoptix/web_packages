import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
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
    newOwnerEmail: string;

    get noUsers(): boolean {
        return this.system.userManager.users.length === 2;
        // Local admin and cloud owner
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
        const errorCodes = {
            selfTransfer: () => {
                this.form.controls.newSystemOwner.setErrors({
                    selfTransfer: true
                });
            },
            duplicateTransfer: () => {
                this.form.controls.newSystemOwner.setErrors({
                    duplicateTransfer: true
                });
            },
            accountDoesNotExist: () => {
                this.form.controls.newSystemOwner.setErrors({
                    accountDoesNotExist: true
                });
            },
        };

        this.transferOwnership = this.processService.createProcess(
            async () => {
                if (this.system.userManager.currentOwner.email === this.newOwnerEmail) {
                    return Promise.reject({ error: 'selfTransfer' });
                }

                if (this.transfers.some(t => t.toAccount === this.newOwnerEmail)) {
                    return Promise.reject({ error: 'duplicateTransfer' });
                }

                const notInSystem = !this.system.userManager.users.some(user =>
                    user.email === this.newOwnerEmail
                );
                if (notInSystem) {
                    return Promise.reject({ error: 'accountDoesNotExist' });
                }

                return this.cloudService
                    .startTransfer(this.system.id, this.newOwnerEmail)
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

    close = () => {
        this.dialogRef.close();
    };
}
