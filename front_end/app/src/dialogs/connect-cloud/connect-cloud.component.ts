import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, Inject, Input, OnInit, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import * as t from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { OauthService } from '@services/oauth.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { pickFrom } from '@utils/general';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-connect-cloud-content',
    templateUrl: 'connect-cloud.component.html',
    styleUrls: []
})
export class ConnectCloudModalContent implements OnInit {
    @Input() closable = true;
    @ViewChild('connectForm', { static: true }) connectForm: NgForm;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    readonly isLocal: boolean;
    readonly environment = environment;

    account: NxAccountService;
    system;
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
        private http: HttpClient,
        private oauthService: OauthService,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private storage: LocalStorageService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['account', 'system'], this);

        this.setupProcess();
        this.setupAuth();

        this.codeSubscription = this.storage.observe(this.CONFIG.oauthStore.code)
            .subscribe(code => this.handleCode(code));

        window.open('/#/cloud-authorize?state=connect', '_blank').focus();
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
            .then(res => {
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

    private setupAuth(): void {
        this.auth.password = '';
        this.account
            .get()
            .then(account => {
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
            ).then(() => this.close(false));
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

    cancel = (): void => {
        let close = Promise.resolve({});
        if (this.cloudTokens) {
            close = this.oauthService.logoutTokens(
                this.cloudTokens.access_token,
                this.cloudTokens.refresh_token
            );
        }

        close.finally(() => this.close(true));
    };

    close = (msg?: boolean): void => {
        this.dialogRef.close(msg);
    };
}
