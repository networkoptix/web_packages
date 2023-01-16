import { Component, Inject, Input } from '@angular/core';
import { of } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import type { IEnvironment } from '@environments/environment-config';
import { servers, toast } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { NxLoginService } from '@services/login.service';
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
    LANG = staticLang;
    needsUpdate: boolean;
    disconnect: Process;
    disconnectInterval: number;
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
        private processService: NxProcessService,
        private loginService: NxLoginService,
        private dialogs: NxDialogsService,
        private systemApiService: NxSystemAPIService,
        private toastService: NxToastService,
        private systemsService: NxSystemsService,
        private account: NxAccountService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: {
            system: NxSystem;
        },
        @Inject(WINDOW) private window: Window,
    ) {
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system'], this);

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
                this.LANG.toastMessage.system.disconnected.success,
                toast.success,
            );
        }, err => {
            if (err?.resultCode === 'userPasswordRequired' || err.errorId === servers.errors.oldSessionErrorId) {
                this.needsUpdate = true;
                this.loginService.currentSystem = this.system;
                return this.loginService.updateSession('disconnect')
                    .then(ready => {
                        this.needsUpdate = !ready;
                        if (ready) {
                            this.disconnect.run();
                        }
                    });
            } else if (err.status === 403 || err.errorId === servers.errors.unauthorized) {
                return this.dialogs.expiredSession().then(() => this.window.location.reload());
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
