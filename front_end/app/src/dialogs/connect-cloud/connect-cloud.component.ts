import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, Input, OnInit, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import * as t from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { OauthService } from '@services/oauth.service';
import { NxProcessService, Process } from '@services/process.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-connect-cloud-content',
    templateUrl: 'connect-cloud.component.html',
    styleUrls: []
})
export class ConnectCloudModalContent implements OnInit {
    @Input() account;
    @Input() system;
    @Input() closable;
    @ViewChild('connectForm', { static: true }) connectForm: NgForm;

    readonly isLocal: boolean;
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

    cloudTokens: any;
    codeExists: boolean;
    codeSubscription: Subscription;
    connectProcess: Process;
    wrongPassword: boolean;

    auth = {
        username: '',
        password: ''
    };

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private http: HttpClient,
        private oauthService: OauthService,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private storage: LocalStorageService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    private connect(systemName, email, accessToken) {
        let headers = new HttpHeaders();
        headers = headers.set('Authorization', `Bearer ${accessToken}`);
        return this.http.post<t.CloudResponse>(
            this.CONFIG.cloudHost + this.CONFIG.apiBase + '/systems/connect',
            { name: systemName, email: email },
            { headers }
        );
    }

    private handleCode(code) {
        return this.system.mediaserver.loginOauth(code, true).toPromise()
            .then((res) => {
                this.codeExists = !!code;
                this.cloudTokens = res;
            });
    }

    private handleConnectLocalToCloud(tokens) {
        const token = tokens.access_token;
        return this.http.get(
            this.CONFIG.cloudHost + '/oauth/introspect/',
            { params: { token } }
        ).pipe(
            switchMap((tokenInfo: any) =>
                this.connect(
                    this.system.info.systemName,
                    tokenInfo.username,
                    token
                )
            ),
            switchMap((res: any) =>
                this.system.mediaserver.saveCloudSystemCredentials(
                    res.id,
                    res.authKey,
                    res.ownerAccountEmail
                )
            )
        ).toPromise();
    }

    private setupAuth() {
        this.auth.password = '';
        this.account
            .get()
            .then((account) => {
                this.auth.username = account.first_name || account.email;
            });
    }

    private setupProcess() {
        const passwordError = () => {
            this.wrongPassword = true;
            this.auth.password = '';

            this.renderer.selectRootElement('#password').focus();
            return true;
        };
        const successHandler = () => {
            return this.oauthService.logoutTokens(
                this.cloudTokens.access_token,
                this.cloudTokens.refresh_token
            ).then(() => this.activeModal.close(false));
        };
        const errorHandler = () => {};
        const settings = {
            ignoreError: true,
            ignoreUnauthorized: true,
            errorCodes: {
                invalidParameter: passwordError,
                wrongPassword: passwordError
            },
            errorPrefix: this.LANG.errorCodes.cantConnectSystemPrefix()
        };
        this.connectProcess = this.processService.createProcess(() => {
            this.connectForm.controls.password.setErrors(undefined);
            return this.system.mediaserver.loginToken(
                this.auth.username,
                this.auth.password,
                true
            ).toPromise()
                .then(() => this.handleConnectLocalToCloud(this.cloudTokens));
        }, settings, successHandler, errorHandler);
    }

    ngOnInit() {
        this.setupProcess();
        this.setupAuth();

        this.codeSubscription = this.storage.observe(this.CONFIG.oauthStore.code)
            .subscribe((code) => this.handleCode(code));

        window.open('/#/cloud-authorize?state=connect', '_blank').focus();
    }

    cancel = () => {
        let close = Promise.resolve({});
        if (this.cloudTokens) {
            close = this.oauthService.logoutTokens(
                this.cloudTokens.access_token,
                this.cloudTokens.refresh_token
            );
        }

        close.finally(() => this.activeModal.dismiss(true));
    }
}
