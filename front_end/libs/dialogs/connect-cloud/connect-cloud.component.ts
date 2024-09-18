import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, OnInit, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { CloudBindData } from '@services/system-api.types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { WINDOW } from '@services/window-provider';
import { oauthStore } from '@static-variables';

import type { ConnectLocalToCloud as DT } from '../dialogs.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-connect-cloud-content',
    templateUrl: 'connect-cloud.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class ConnectCloudModalContent extends ModalBase<DT['return']> implements OnInit {
    @ViewChild('connectForm', { static: true }) private connectForm: NgForm;
    @ViewChild('passwordContainer') private passwordContainer: ElementRef<HTMLDivElement>;
    // Password input is used by NgModel

    LANG = staticLang;
    CONFIG: IConfig;
    readonly isLocal: boolean;
    readonly environment = environment;

    bindData: CloudBindData;
    bindDataExists: boolean;
    private bindSubscription: Subscription;
    connectProcess: Process;
    wrongPassword: boolean;

    auth = {
        username: '',
        password: '',
    };

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private storage: LocalStorageService,
        private account: NxAccountService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private system: DT['data'],
        @Inject(WINDOW) private window: Window,
    ) {
        super(dialogRef);
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.setupProcess();
        this.setupAuth();

        this.bindSubscription = this.storage
            .observe(oauthStore.bindData)
            .subscribe((code: CloudBindData) => this.handleBindInfo(code));

        this.window
            .open(
                `/#/cloud-authorize?state=connect&system_name=${this.system.info.systemName}`,
                '_blank',
            )
            ?.focus();
    }

    private handleBindInfo(data: CloudBindData): void {
        this.bindDataExists = !!data;
        this.bindSubscription?.unsubscribe();
        this.storage.clear(oauthStore.bindData);
        setTimeout(() => {
            this.passwordContainer.nativeElement.querySelector('input')?.focus();
        });
        this.bindData = data;
    }

    private setupAuth(): void {
        this.auth.password = '';
        this.account.get().then(account => {
            this.auth.username = account.name || account.email;
        });
    }

    private setupProcess(): void {
        const passwordError = (): true => {
            this.wrongPassword = true;
            this.auth.password = '';

            this.renderer.selectRootElement('#password').focus();
            return true;
        };
        const successHandler = async (): Promise<void> => {
            this.close(false);
        };
        const errorHandler = (): void => {
            this.unlock();
        };
        const settings = {
            ignoreError: true,
            ignoreUnauthorized: true,
            errorCodes: {
                invalidParameter: passwordError,
                wrongPassword: passwordError,
            },
            errorPrefix: this.LANG.errorCodes.cantConnectSystemPrefix,
        };
        this.connectProcess = this.processService.createProcess(
            () => {
                this.lock();
                this.connectForm.controls.password.setErrors(null);
                return firstValueFrom(
                    this.system.mediaserver
                        .loginToken(this.auth.username, this.auth.password, true)
                        .pipe(
                            switchMap(() =>
                                (
                                    this.system.mediaserver as NxSystemRestAPI3
                                ).saveCloudSystemCredentials(this.bindData),
                            ),
                        ),
                );
            },
            settings,
            successHandler,
            errorHandler,
        );
    }

    cancel = (): void => {
        this.close(true);
    };
}
