import { Component, Inject, Input, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

import { NxToastService } from '../toast.service';

@Component({
    selector: 'nx-mandatory-2fa',
    templateUrl: 'mandatory-2fa.component.html',
    styleUrls: []
})
export class Mandatory2faModalContent {
    @Input() closable = true;

    CONFIG: IConfig;
    LANG = staticLang;

    system: NxSystem;
    system2faEnabled: boolean;
    mandatory2fa: Process;
    verificationCode: string;
    showError = false;

    public notAuthorized: boolean;

    @ViewChild('mandatory2faForm') mandatory2faForm: NgForm;

    // TODO: get the number of user's without 2fa for system
    usersWithout2fa = 0;

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private renderer: Renderer2,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system2faEnabled', 'system'], this);

        this.showError = !this.accountService.account.totpExistsForAccount;
        const notAuthorizedHandler = () => {
            this.notAuthorized = true;
            this.mandatory2faForm.controls.verificationCode.markAsTouched();
            this.mandatory2faForm.controls.verificationCode.setErrors({ invalid: true });
            this.renderer.selectRootElement('#verificationCode').focus();
        };

        this.mandatory2fa = this.processService
            .createProcess(() => {
                return this.cloudApiService.toggle2faForSystem(
                    this.system.id,
                    this.verificationCode
                );
            }, {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    notAuthorized: notAuthorizedHandler,
                    badRequest: notAuthorizedHandler
                }
            }, () => {
                this.system.currentServerNotBusy = true;
                this.close('success');
                const successMessage = this.system2faEnabled
                    ? this.LANG.dialogs.message.system2faEnabled
                    : this.LANG.dialogs.message.system2faDisabled;
                this.toastService.notify(
                    successMessage,
                    this.CONFIG.toast.success,
                );
                // });
            }, err => {
                if (!err.resultCode) {
                    this.system.currentServerNotBusy = true;
                    this.showError = true;
                }
            });
    }

    close = (msg?: string): void => {
        this.dialogRef.close(msg);
    };

    cancel = () => this.close('cancel');
}
