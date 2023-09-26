import { Injectable } from '@angular/core';

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
import { nxConfig } from './nx-config/config';
import { windowFactory } from './window-provider';

/** Service to handle opening the VMS Client from the browser
 *
 * Future TODO: Remove non-OAuth code once support for v4 systems is dropped
 */
@Injectable({
    providedIn: 'root',
})
export class NxUrlProtocolService {
    public CONFIG: typeof nxConfig = nxConfig;
    public window: Window = windowFactory();
    public host = environment.production ? this.window.location.host : environment.cloudHost;

    constructor(
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
    ) {}

    get baseUri(): string {
        return `${this.CONFIG.clientProtocol}://`;
    }

    public generateLink(systemId: string, auth: string, code: string): string {
        const base = slashJoin([`${this.baseUri}${this.host}`, 'client', systemId], {
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

    public getLinkLegacy(systemId: string, useOauth: boolean): Promise<string> {
        return Promise.all([
            useOauth ? Promise.resolve('') : this.accountService.authKey(),
            environment.isLocal || !useOauth
                ? Promise.resolve({ code: '' })
                : this.cloudApiService.getCode('*').toPromise(),
        ]).then(([auth, { code }]) => {
            return this.generateLink(systemId, auth, code);
        });
        // .catch(() => this.generateLink(systemId));
        // Commenting this out for now because nobody remembers what this was for
    }

    public getLinkOauth(systemId: string): Promise<{ code: string; link: string }> {
        return Promise.resolve(
            environment.isLocal
                ? Promise.resolve({ code: '' })
                : this.cloudApiService.getCode('*').toPromise(),
        ).then(({ code }) => {
            const link = this.generateLink(systemId, '', code);
            return { code, link };
        });
    }

    open(systemId: string, useOauth: boolean): Promise<void> {
        if (!useOauth) {
            return this.getLinkLegacy(systemId, useOauth).then(link => {
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
        } else {
            return this.getLinkOauth(systemId).then(({ code, link }) => {
                return new Promise<void>((resolve, reject) => {
                    protocolCheck(
                        link,
                        () => {
                            setTimeout(() => {
                                this.cloudApiService
                                    .getTokensFromCloud(code)
                                    .toPromise()
                                    .then(res => {
                                        this.cloudApiService
                                            .logoutTokens(res.access_token, res.refresh_token)
                                            .finally(() => {
                                                reject({ resultCode: openClientError });
                                            });
                                    })
                                    .catch(() => resolve());
                            }, openClientTimeout);
                        },
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

    openDesktopAsTemporaryUser(temporaryUserToken: string): void {
        const uri = `${this.baseUri}${this.window.location.host}?tmp_token=${temporaryUserToken}`;
        this.window.location.href = uri;
    }
}
