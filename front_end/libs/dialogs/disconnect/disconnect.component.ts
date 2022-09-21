import { Component, Inject, Input } from '@angular/core';
import { of } from 'rxjs';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import type { IEnvironment } from '@environments/environment-config';
import { NxAccountService } from '@services/account.service';
import { NxLoginService } from '@services/login.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemAPIService } from '@services/system-api.service';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-disconnect-content',
    templateUrl: 'disconnect.component.html',
    styleUrls: []
})
export class DisconnectModalContent {
    @Input() closable: boolean = true;

    readonly environment: IEnvironment = environment;
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    needsUpdate: boolean;
    disconnect: Process;
    disconnectInterval: number;
    account: NxAccountService;
    system: NxSystem;
    // password: string;
    // wrongPassword: boolean;
    // auth = {
    //     username : '',
    //     password : ''
    // };

    // hideErrors = true;

    // @ViewChild('disconnectForm', { static: true }) disconnectForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        private processService: NxProcessService,
        private loginService: NxLoginService,
        private simpleDialogService: NxSimpleDialogsService,
        private systemApiService: NxSystemAPIService,
        private toastService: NxToastService,
        private systemsService: NxSystemsService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            account: NxAccountService;
            system: NxSystem;
        },
        @Inject(WINDOW) private window: Window,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['account', 'system'], this);

        // const passwordError = () => {
        //     this.wrongPassword = true;
        //     this.auth.password = '';

        //     this.renderer.selectRootElement('#password').focus();
        //     return true;
        // };
        // this.auth.password = '';
        // this.account
        //     .get()
        //     .then((account) => {
        //         if (account) {
        //             this.auth.username = this.isLocal ? account.first_name : account.email;
        //         }
        //     });

        this.disconnect = this.processService.createProcess(() => {
            // this.disconnectForm.controls.password.setErrors(undefined);
            // this.wrongPassword = false;

            if (this.environment.isLocal) {
                return this.disconnectLocal();
            }
            clearInterval(this.disconnectInterval);
            return new Promise<void>((resolve, reject) => {
                this.account.disconnect(this.system.id).then(() => {
                    this.systemsService.userDisconnectSystem = true;
                    this.disconnectInterval = this.window.setInterval(() => {
                        this.systemsService
                            .forceUpdateSystemsAsPromise()
                            .then(systems => {
                                if (!systems.find(sys => sys.id === this.system.id)) {
                                    clearInterval(this.disconnectInterval);
                                    resolve();
                                }
                            });
                    }, 2000);
                }).catch(e => reject(e));
            });
        }, {
            ignoreError: true,
            ignoreUnauthorized: true
            // errorCodes         : {
            //     'Wrong password.' : passwordError,
            //     wrongPassword     : passwordError
            // },
            // errorPrefix        : this.LANG.errorCodes.cantDisconnectSystemPrefix()
        }, res => {
            this.close(true);
            this.toastService.notify(
                this.LANG.toastMessage.system.disconnected.success(),
                this.CONFIG.toast.success,
            );
        }, err => {
            if (err?.resultCode === 'userPasswordRequired' || err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                this.needsUpdate = true;
                this.loginService.currentSystem = this.system;
                return this.loginService.updateSession('disconnect')
                    .then(ready => {
                        this.needsUpdate = !ready;
                        if (ready) {
                            this.disconnect.run();
                        }
                    });
            } else if (err.status === 403 || err.errorId === this.CONFIG.servers.errors.unauthorized) {
                return this.simpleDialogService.expiredSession().then(() => this.window.location.reload());
            }
        });
    }

    close = (msg?: boolean): void => {
        clearInterval(this.disconnectInterval);
        this.dialogRef.close(msg);
    };

    private disconnectLocal(): Promise<void> {
        return this.systemApiService
            .createConnection<NxSystemRestAPI>(
                undefined,
                undefined,
                undefined,
                () => of('')
            )
            .disconnectFromCloud();
    }
}
