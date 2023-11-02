import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, Inject, OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from 'ngx-webstorage';
import { Observable, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import * as t from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { OauthService } from '@services/oauth.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { apiBase, oauthStore } from '@static-variables';

import type { ConnectLocalToCloud as DT } from '../dialogs.types';

// These are probably usable elsewhere, but limiting scope to this dialog for now
interface Token {
    access_token: string;
    expires_at: string;
    expires_in: string;
    refresh_token: string;
    scope: string;
    token_type: string;
}

type Connect = Omit<
    t.System,
    | 'accessRole'
    | 'capabilities'
    | 'lastLoginTime'
    | 'ownerFullName'
    | 'sharingPermissions'
    | 'sateofHealth'
    | 'usageFrequency'
    | 'version'
>;

interface Introspect extends Omit<Token, 'refresh_token'> {
    username: string;
    time_since_password: string;
}

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

    private cloudTokens: Token;
    codeExists: boolean;
    private codeSubscription: Subscription;
    connectProcess: Process;
    wrongPassword: boolean;

    auth = {
        username: '',
        password: '',
    };

    constructor(
        configService: NxConfigService,
        private http: HttpClient,
        private oauthService: OauthService,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private storage: LocalStorageService,
        private account: NxAccountService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private system: DT['data'],
    ) {
        super(dialogRef);
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.setupProcess();
        this.setupAuth();

        this.codeSubscription = this.storage
            .observe(oauthStore.code)
            .subscribe(code => this.handleCode(code));

        window.open('/#/cloud-authorize?state=connect', '_blank').focus();
    }

    private connect(systemName: string, email: string, accessToken: string): Observable<Connect> {
        let headers = new HttpHeaders();
        headers = headers.set('Authorization', `Bearer ${accessToken}`);
        return this.http.post<Connect>(
            this.CONFIG.cloudHost + apiBase + '/systems/connect',
            { name: systemName, email },
            { headers },
        );
    }

    private handleCode(code: string): Promise<void> {
        return this.system.mediaserver
            .loginOauth(code, true)
            .toPromise()
            .then((res: Token) => {
                this.codeExists = !!code;
                this.cloudTokens = res;
                this.codeSubscription?.unsubscribe();
                this.storage.clear(oauthStore.code);
                if (this.codeExists) {
                    setTimeout(() => {
                        this.passwordContainer.nativeElement.querySelector('input').focus();
                    });
                    // Allow password input to become enabled
                }
            });
    }

    private handleConnectLocalToCloud(tokens: Token): Promise<unknown> {
        const token = tokens.access_token;
        return this.http
            .get<Introspect>(this.CONFIG.cloudHost + '/oauth/introspect/', { params: { token } })
            .pipe(
                switchMap(tokenInfo =>
                    this.connect(this.system.info.systemName, tokenInfo.username, token),
                ),
                switchMap(res =>
                    this.system.mediaserver.saveCloudSystemCredentials(
                        res.id,
                        res.authKey,
                        res.ownerAccountEmail,
                    ),
                ),
            )
            .toPromise();
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
        const successHandler = (): Promise<void> => {
            return this.oauthService
                .logoutTokens(this.cloudTokens.access_token, this.cloudTokens.refresh_token)
                .then(() => this.close(false));
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
                this.connectForm.controls.password.setErrors(undefined);
                return this.system.mediaserver
                    .loginToken(this.auth.username, this.auth.password, true)
                    .toPromise()
                    .then(() => this.handleConnectLocalToCloud(this.cloudTokens));
            },
            settings,
            successHandler,
            errorHandler,
        );
    }

    cancel = (): void => {
        let close = Promise.resolve({});
        if (this.cloudTokens) {
            close = this.oauthService.logoutTokens(
                this.cloudTokens.access_token,
                this.cloudTokens.refresh_token,
            );
        }

        close.finally(() => this.close(true));
    };
}
