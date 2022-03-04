import { Component, OnInit, Input, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
// import { NxCloudApiService } from '@services/nx-cloud-api';
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
    @Input() closable: boolean;

    @ViewChild('transferOwnershipForm') form: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    transferComplete: boolean = false;
    hideErrors: boolean = false;
    transferOwnership: Process;
    newOwner: string;
    newRole: string = 'Administrator'; // Probably not actually hardcoded
    // newRole: NxSystemRole;
    // accessDescription: string;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        // private cloudService: NxCloudApiService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnInit(): void {
        // this.newRole = this.system.userManager.accessRoles.find(role =>
        //     role.name.toLowerCase() === 'administrator'
        // );

        const errorCodes = {
            // accountDoesNotExist: () => {
            //     this.form.controls.newOwnerEmail.setErrors({
            //         accountDoesNotExist: true
            //     });
            // },
        };

        this.transferOwnership = this.processService.createProcess(
            async () => {
                // const res = await this.cloudService
                //     .checkIfEmailExistsInCloud(this.newOwner);
                // if (!res.emailExists) {
                //     return Promise.reject({ error: 'accountDoesNotExist' });
                // }
                // // TODO: Check for if user has verified account
                return Promise.resolve();
            },
            { errorCodes },
            () => { this.transferComplete = true; },
            () => {},
        );
    }
}
