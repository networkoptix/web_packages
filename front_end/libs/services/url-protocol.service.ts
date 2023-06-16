import { Inject, Injectable } from '@angular/core';

import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { slashJoin } from '@utils/general';
import { protocolCheck } from '@utils/protocolcheck';

import {
    openClientError,
    openClientTimeout,
    openMobileClientTimeout,
} from '../variables/static-variables';

import { NxAccountService } from './account.service';
import { nxConfig as CONFIG } from './nx-config/config';
import { WINDOW } from './window-provider';

/** Service to handle opening the VMS Client from the browser
 *
 * Future TODO: Remove non-OAuth code once support for v4 systems is dropped
 */
@Injectable({
    providedIn: 'root',
})
export class NxUrlProtocolService {
    constructor(
        @Inject(WINDOW) private window: Window,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
    ) {}

    private generateLink(systemId: string, auth: string, code: string): string {
        const host = environment.production ? this.window.location.host : environment.cloudHost;

        const base = slashJoin([`${CONFIG.clientProtocol}://${host}`, 'client', systemId], {
            trailing: true,
        });
        const url = new URL(base);
        if (auth) {
            url.searchParams.append('auth', auth);
        }
        if (code) {
            url.searchParams.append('code', code);
        }

        return url.toString();
    }

    private getLink(systemId: string, useOauth: boolean): Promise<string> {
        return Promise.all([
            useOauth ? Promise.resolve('') : this.accountService.authKey(),
            environment.isLocal
                ? Promise.resolve({ code: '' })
                : this.cloudApiService.getCode('*').toPromise(),
        ]).then(([auth, { code }]) => {
            return this.generateLink(systemId, auth, code);
        });
        // .catch(() => this.generateLink(systemId));
        // Commenting this out for now because nobody remembers what this was for
    }

    open(systemId: string, useOauth: boolean): Promise<void> {
        return this.getLink(systemId, useOauth).then(link => {
            /* The browser opens a dialog that we cannot directly detect or get a response from.
             * However, when the browser dialog opens it causes the page to blur so we use that to detect what happens.
             */
            return new Promise<void>((resolve, reject) => {
                protocolCheck(
                    link,
                    resolve,
                    () => {
                        reject({ resultCode: openClientError });
                    },
                    openClientTimeout,
                    openMobileClientTimeout,
                );
            });
        });
    }
}
