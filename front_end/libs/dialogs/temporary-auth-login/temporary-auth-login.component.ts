import { DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxDialogsService } from '@dialogs/dialogs.service';
import type { LoginWebAdmin as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { NxLoginService } from '@services/login.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { LOGIN_STATE } from '@services/session.service.types';
import { NxSystemAPIService } from '@services/system-api.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxUrlProtocolService } from '@services/url-protocol.service';
import { WINDOW } from '@services/window-provider';
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

    private urlProtocol = inject(NxUrlProtocolService);
    private nxSystemAPIService = inject(NxSystemAPIService);
    private account = inject(NxAccountService);
    private loginService = inject(NxLoginService);
    private dialogService = inject(NxDialogsService);
    private window = inject(WINDOW);
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
            version: this.CONFIG.system.version.major,
        }) as NxSystemRestAPI3;

        this.temporaryUserToken = this.loginService.temporaryUserToken$$();

        this.openDesktopApp();
    }

    openDesktopApp(): void {
        this.urlProtocol.openDesktopAsTemporaryUser(this.temporaryUserToken);
    }

    handleLoginToWeb(): void {
        this.mediaServerApi.temporaryUserTokenExchange(this.temporaryUserToken).subscribe({
            next: res => {
                this.mediaServerApi.loginTokenUrl(res.token).subscribe(loggedInAccount => {
                    this.account.loginState = LOGIN_STATE.AUTHORIZED;
                    setTimeout(() => this.window.location.reload(), this.urlUpdateTimeout);
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
