import { Component, Input, OnInit, inject } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
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
    imports: [AngularSvgIconModule],
})
export class TemporaryAuthLoginComponent implements OnInit {
    @Input() temporaryUserToken: string;
    @Input() urlUpdateTimeout: number = 150;

    private urlProtocol = inject(NxUrlProtocolService);
    private nxSystemAPIService = inject(NxSystemAPIService);
    private account = inject(NxAccountService);
    private window = inject(WINDOW);

    protected mediaServerApi: NxSystemRestAPI3;

    CONFIG = inject(NxConfigService).getConfig();
    readonly environment = environment;
    images = images;

    ngOnInit(): void {
        this.mediaServerApi = this.nxSystemAPIService.createConnection({
            version: this.CONFIG.system.version.major,
        }) as NxSystemRestAPI3;
        this.openDesktopApp();
    }

    openDesktopApp(): void {
        this.urlProtocol.openDesktopAsTemporaryUser(this.temporaryUserToken);
    }

    handleLoginToWeb(): void {
        this.mediaServerApi.temporaryUserTokenExchange(this.temporaryUserToken).subscribe(res => {
            this.mediaServerApi.loginTokenUrl(res.token).subscribe(loggedInAccount => {
                this.account.loginState =
                    loggedInAccount.email || loggedInAccount.name || loggedInAccount.username;
                setTimeout(() => this.window.location.reload(), this.urlUpdateTimeout);
            });
        });
    }
}
