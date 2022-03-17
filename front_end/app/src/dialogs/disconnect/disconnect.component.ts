import { Component, Inject, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import type { IEnvironment } from '@environments/environment-config';
import { NxAccountService } from '@services/account.service';
import { NxLoginService } from '@services/login.service';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import {
    NxSystemAPI,
    NxSystemAPIService,
    NxSystemRestAPI
} from '@services/system-api.service';
import { NxSystem } from '@services/system.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-modal-disconnect-content',
    templateUrl: 'disconnect.component.html',
    styleUrls: []
})
export class DisconnectModalContent {
    @Input() account: NxAccountService;
    @Input() system: NxSystem;
    @Input() closable: boolean;

    readonly environment: IEnvironment = environment;
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    needsUpdate: boolean;
    disconnect: Process;
    // password: string;
    // wrongPassword: boolean;
    // auth = {
    //     username : '',
    //     password : ''
    // };

    // hideErrors = true;
    mediaServerApi: Partial<NxSystemAPI | NxSystemRestAPI>;

    // @ViewChild('disconnectForm', { static: true }) disconnectForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private loginService: NxLoginService,
        private simpleDialogService: NxSimpleDialogsService,
        // private renderer: Renderer2,
        private systemApiService: NxSystemAPIService,
        private toastService: NxToastService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
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
            return this.account.disconnect(this.system.id);
        }, {
            ignoreError: true,
            ignoreUnauthorized: true
            // errorCodes         : {
            //     'Wrong password.' : passwordError,
            //     wrongPassword     : passwordError
            // },
            // errorPrefix        : this.LANG.errorCodes.cantDisconnectSystemPrefix()
        }, res => {
            this.activeModal.close(true);
            const options = {
                classname: this.CONFIG.toast.success,
                autohide: true,
                delay: this.CONFIG.alertTimeout
            };
            this.toastService.show(
                this.LANG.toastMessage.system.disconnected.success(),
                options
            );
        }, (err) => {
            if (err.errorId === this.CONFIG.servers.errors.oldSessionErrorId) {
                this.needsUpdate = true;
                this.loginService.currentSystem = this.system;
                this.loginService.updateSession('disconnect')
                    .then((ready) => {
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

    close() {
        this.activeModal.close();
    }

    private disconnectLocal() {
        this.mediaServerApi = this.systemApiService
            .createConnection(undefined, undefined, undefined, () => of(''));

        return (this.mediaServerApi as NxSystemRestAPI).disconnectFromCloud();
    }
}
