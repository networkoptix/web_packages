import {
    Component, Inject, OnInit,
    Input, ViewChild, Renderer2
}                                    from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { Router }                    from '@angular/router';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { LocalStorageService }       from 'ngx-webstorage';
import { of }                        from 'rxjs';

import { NxModalGenericComponent }   from '../generic/generic.component';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxProcessService, Process } from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxSystem }                  from '../../services/system.service';
import {
    NxSystemAPI, NxSystemAPIService
}                                    from '../../services/system-api.service';
import { NxDialogsService }          from '../dialogs.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector    : 'cloud-connect-modal-content',
    templateUrl : 'cloud-connect.component.html',
    styleUrls   : []
})
export class CloudConnectModalContent implements OnInit {
    @Input() system: NxSystem;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    mediaServerApi: NxSystemAPI;
    locationService: Location;
    auth;
    next: string;
    password: string;
    remember: boolean;
    connectProcess: Process;

    wrongPassword: boolean;
    accountBlocked: boolean;
    hideErrors = true;

    @ViewChild('connectForm', { static: true }) connectForm: HTMLFormElement;

    private setupDefaults() {
        this.auth = { email: this.localStorage.retrieve('email') };
        this.next = '';
        this.password = '';
        this.remember = true;
        this.wrongPassword = false;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private localStorage: LocalStorageService,
        private genericModal: NxModalGenericComponent,
        private renderer: Renderer2,
        private router: Router,
        private dialogs: NxDialogsService,
        @Inject(DOCUMENT) private document: any
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.locationService = locationService;

        this.setupDefaults();
    }

    resetForm() {
        const { errors } = this.connectForm.controls.login_email;
        if (errors) {
            delete this.connectForm.not_activated;
            this.connectForm.controls.login_email.setErrors(Object.keys(errors).length ? errors : undefined);
        }
        if (!this.connectForm.valid) {
            this.connectForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;
        }
    }

    setEmail(email) {
        this.auth.email = email;
        this.localStorage.store('email', this.auth.email);
    }

    ngOnInit() {
        // Check the url queryParams for next. if it exists set next equal to it.
        const nextUrl = /\?next=(.*)/.exec(this.document.location.search.replace(/%2F/g, '/'));
        if (nextUrl && nextUrl.length > 1) {
            this.next = nextUrl[1];
        }
        this.password = '';

        this.connectProcess = this.processService.createProcess(() => {
            this.connectForm.controls.login_email.setErrors(undefined);
            this.connectForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;

            if (this.password === '') {
                this.connectForm.controls.login_password.setErrors({ required: true });
                this.renderer.selectRootElement('#login_password').focus();
                return Promise.reject();
            }

            return this.cloudApiService.connect(this.system.info.systemName, this.auth.email, this.password);
        }, {
            ignoreUnauthorized : true,
            errorCodes         : {
                accountNotActivated: () => {
                    this.password = '';
                    this.connectForm.controls.login_password.markAsPristine();
                    this.connectForm.controls.login_password.markAsUntouched();

                    this.connectForm.controls.login_email.setErrors({ not_activated: true });
                    this.renderer.selectRootElement('#login_email').select();
                },
                badUsername: () => {
                    this.connectForm.controls.login_email.setErrors({ no_user: true });
                    this.renderer.selectRootElement('#login_email').select();
                },
                notAuthorized: () => {
                    this.wrongPassword = true;
                    this.connectForm.controls.login_password.setErrors({ nx_wrong_password: true });
                    this.password = '';

                    this.renderer.selectRootElement('#login_password').focus();
                },
                accountBlocked: () => {
                    this.connectForm.controls.login_password.markAsPristine();
                    this.connectForm.controls.login_password.markAsUntouched();

                    this.accountBlocked = true;
                    this.connectForm.controls.login_password.setErrors({ nx_account_blocked: true });
                },
                wrongParameters: () => {
                },
                portalError: this.LANG.errorCodes.brokenAccount
            }
        }).then((result) => {
            if (result.cloudConnectionSubscriptionStatus) {
                this.mediaServerApi = this.systemApiService
                    .createConnection(undefined, undefined, undefined, () => of(''));
                this.mediaServerApi.saveCloudSystemCredentials(result.id, result.authKey, result.ownerAccountEmail)
                    .then((result) => {
                        this.dialogs.notify(this.LANG.toastMessage.system.cloudConnect.success(), 'success');
                        this.activeModal.close(result);
                    })
                    .catch((error) => {
                        this.dialogs.notify(this.LANG.toastMessage.system.cloudConnect.failed(), 'danger');
                        console.error(error);
                    });
            } else {
                this.dialogs.notify(this.LANG.toastMessage.system.cloudConnect.failed(), 'danger');
                console.error('Invalid response while connecting system to cloud.', result);
            }
        }, (error) => {
            if (error?.resultCode === 'portalError') {
                // close dialog ... process will show toaster
                this.close();
            }
        });
    }

    displayErrors = () => {
        this.hideErrors = false;
    }

    close() {
        this.activeModal.close();
    }
}
