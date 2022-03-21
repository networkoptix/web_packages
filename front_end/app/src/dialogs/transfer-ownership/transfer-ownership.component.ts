import { Component, OnInit, Input, ViewChild, Inject } from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-transfer-ownership-content',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss']
})
export class TransferOwnershipModalContent implements OnInit {
    @Input() system: NxSystem;
    @Input() transfers: SystemTransferInfo[];
    @Input() closable: boolean = true;

    @ViewChild('transferOwnershipForm') form: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system: NxSystem;
    transferComplete: boolean = false;
    hideErrors: boolean = false;
    transferOwnership: Process;
    newOwnerEmail: string;
    newRole: string = 'Administrator'; // Probably not actually hardcoded
    // newRole: NxSystemRole;
    // accessDescription: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system'], this);
        // this.newRole = this.system.userManager.accessRoles.find(role =>
        //     role.name.toLowerCase() === 'administrator'
        // );

        const errorCodes = {
            accountDoesNotExist: () => {
                this.form.controls.newSystemOwner.setErrors({
                    accountDoesNotExist: true
                });
            },
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
        };

        this.transferOwnership = this.processService.createProcess(
            async () => {
                if (this.system.userManager.currentOwner.email === this.newOwnerEmail) {
                    return Promise.reject({ error: 'selfTransfer' });
                }
                if (this.transfers.some(t => t.toAccount === this.newOwnerEmail)) {
                    return Promise.reject({ error: 'duplicateTransfer' });
                }
                const res = await this.cloudService
                    .checkIfEmailExistsInCloud(this.newOwnerEmail);
                if (!res.emailExists) {
                    return Promise.reject({ error: 'accountDoesNotExist' });
                } else {
                    return this.cloudService
                        .startTransfer(this.system.id, this.newOwnerEmail)
                        .toPromise();
                }
                // TODO: Check for if user has verified account
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
