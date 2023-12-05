import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import LANG from '@language_static';
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
import { NxSystemService } from './system.service/system.service';
import type { NxSystemInfo } from './systems.service.types';

/** Service to handle opening the VMS Client from the browser
 *
 * Future TODO: Remove non-OAuth code once support for v4 systems is dropped
 */
@Injectable({
    providedIn: 'root',
})
export class NxUrlProtocolService {
    private host = environment.production ? window.location.host : environment.cloudHost;

    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
        private systemService: NxSystemService,
        private dialogs: NxDialogsService,
    ) {}

    private get baseUri(): string {
        return `${CONFIG.clientProtocol}://`;
    }

    private generateLink(systemId: string, auth: string, code: string): string {
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

    private getLinkLegacy(systemId: string): Promise<string> {
        return this.accountService.authKey().then(auth => this.generateLink(systemId, auth, ''));
    }

    private getLinkOauth(systemId: string): Promise<{ code: string; link: string }> {
        return (
            environment.isLocal
                ? Promise.resolve({ code: '' })
                : this.cloudApiService.getCode('*').toPromise()
        ).then(({ code }) => {
            const link = this.generateLink(systemId, '', code);
            return { code, link };
        });
    }

    private checkLink(systemId: string, useOauth: boolean): Promise<void> {
        if (!useOauth) {
            return this.getLinkLegacy(systemId).then(link => {
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
                /* If user has previously checked "Always allow {location.host} to open {protocol} links"
                in the browser dialog, the dialog will not appear and cause the page to blur
                when the client is opened

                In that case, we try to get cloud tokens using the access code. If this fails,
                then the code has already been used (by the installed client). Otherwise, invalidate
                the tokens and reject. */
                return new Promise<void>((resolve, reject) => {
                    protocolCheck(
                        link,
                        resolve,
                        () => {
                            firstValueFrom(this.cloudApiService.getTokensFromCloud(code))
                                .then(res => {
                                    this.cloudApiService
                                        .logoutTokens(res.access_token, res.refresh_token)
                                        .finally(() => reject());
                                })
                                .catch(() => resolve());
                        },
                        openClientTimeout,
                        openMobileClientTimeout,
                    );
                });
            });
        }
    }

    openDesktopAsTemporaryUser(temporaryUserToken: string): void {
        const uri = `${this.baseUri}${window.location.host}?tmp_token=${temporaryUserToken}`;
        window.location.href = uri;
    }

    openingSystem$$ = signal<string | null>(null);
    openVmsClient(system?: Pick<NxSystemInfo, 'id' | 'useRest'>): void {
        const account = this.accountService.account;
        system ??= this.systemService.getCurrentSystem();

        if (account.account2faEnabled && !system.useRest) {
            this.dialogs.client2faWarning();
            return;
        }

        const startUrl = this.router.url;
        this.openingSystem$$.set(system.id);
        this.checkLink(system.id, system.useRest)
            .catch(() => {
                // Don't show the dialog if user has already navigated away
                if (startUrl !== this.router.url) {
                    return Promise.resolve();
                }
                return this.dialogs
                    .confirm({
                        title: LANG.dialogs.titles.noClientDetected,
                        message: LANG.errorCodes.cantOpenClient,
                        footer: {
                            actionLabel: LANG.dialogs.buttons.download,
                            cancelLabel: LANG.dialogs.buttons.cancel,
                        },
                    })
                    .then(result => {
                        if (result) {
                            this.router.navigate(['/download']);
                        }
                    });
            })
            .finally(() => {
                this.openingSystem$$.set(null);
            });
    }
}
