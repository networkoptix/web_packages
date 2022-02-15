import { Component, OnInit, Input, ViewChild, Inject } from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxSystemRole
} from '@services/system.service/user-manager/user-manager-types';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'src-transfer-ownership',
    templateUrl: './transfer-ownership.component.html',
    styleUrls: ['./transfer-ownership.component.scss']
})
export class TransferOwnershipModalContent implements OnInit {
    @Input() closable: boolean = true;

    @ViewChild('transferOwnershipForm') form: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system: NxSystem;
    transferComplete: boolean = false;
    hideErrors: boolean = false;
    transferOwnership: Process;
    newOwner: string;
    newRole: NxSystemRole;
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

        this.newRole = this.system.userManager.accessRoles.find(role =>
            role.name.toLowerCase() === 'administrator'
        );

        const errorCodes = {
            accountDoesNotExist: () => {
                this.form.controls.newOwnerEmail.setErrors({
                    accountDoesNotExist: true
                });
            },
        };

        this.transferOwnership = this.processService.createProcess(
            async () => {
                const res = await this.cloudService
                    .checkIfEmailExistsInCloud(this.newOwner);
                if (!res.emailExists) {
                    return Promise.reject({ error: 'accountDoesNotExist' });
                }
                // TODO: Check for if user has verified account
                return Promise.resolve();
            },
            { errorCodes },
            () => { this.transferComplete = true; },
            () => {},
        );
    }

    close = () => {
        this.dialogRef.close();
    }
}
