import { DialogRef } from '@angular/cdk/dialog';
import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxDialogsService } from '@dialogs/dialogs.service';
import type { LoginWebAdmin as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxLoginService } from '@services/login.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSessionService } from '@services/session.service';
import { LOGIN_STATE } from '@services/session.service.types';
import { NxSystemAPIService } from '@services/system-api.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { images } from '@static-variables';

@Component({
    selector: 'nx-temporary-auth-login',
    templateUrl: './temporary-auth-login.component.html',
    styleUrls: ['./temporary-auth-login.component.scss'],
    standalone: true,
    imports: [AngularSvgIconModule, TranslateModule],
})
export class TemporaryAuthLoginComponent extends ModalBase<DT['return']> implements OnInit {
    readonly urlUpdateTimeout: number = 150;

    LANG = staticLang;

    private nxSystemAPIService = inject(NxSystemAPIService);
    private loginService = inject(NxLoginService);
    private dialogService = inject(NxDialogsService);
    private sessionService = inject(NxSessionService);
    private temporaryUserToken: string;

    protected mediaServerApi: NxSystemRestAPI3;

    CONFIG = inject(NxConfigService).getConfig();
    readonly environment = environment;
    images = images;

    constructor(dialogRef: DialogRef<DT['return']>) {
        super(dialogRef);
    }

    ngOnInit(): void {
        this.mediaServerApi = this.nxSystemAPIService.createConnection({
            version: this.CONFIG.system.version?.major || NxSystemRestAPI3.VERSION,
        }) as NxSystemRestAPI3;

        this.temporaryUserToken = this.loginService.temporaryUserToken$$();

        const uri = `${this.CONFIG.clientProtocol}://${window.location.host}?tmp_token=${this.temporaryUserToken}`;
        window.location.href = uri;
    }

    handleLoginToWeb(): void {
        this.mediaServerApi.temporaryUserTokenExchange(this.temporaryUserToken).subscribe({
            next: res => {
                this.mediaServerApi.loginTokenUrl(res.token).subscribe(loggedInAccount => {
                    this.sessionService.loginState = LOGIN_STATE.AUTHORIZED;
                    setTimeout(() => window.location.reload(), this.urlUpdateTimeout);
                });
            },
            error: error => {
                this.dialogService.alert({
                    title: this.LANG.dialogs.titles.error,
                    message: error.error.errorString,
                });
            },
        });
    }
}
