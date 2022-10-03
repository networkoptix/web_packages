import { Component, OnInit, Input, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api.types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import type {
    NxSystem,
    // NxSystemRole,
} from '@services/system.service';

@Component({
    selector: 'nx-modal-transfer-ownership-content',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss']
})
export class TransferOwnershipModalContent implements OnInit {
    @Input() system: NxSystem;
    @Input() transfers: SystemTransferInfo[];
    @Input() closable: boolean;

    @ViewChild('transferOwnershipForm') form: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

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
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit(): void {
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
}
