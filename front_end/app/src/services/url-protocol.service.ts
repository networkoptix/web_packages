import { Inject, Injectable } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxCloudApiService } from '@services/nx-cloud-api';

import { NxAccountService } from './account.service';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { WINDOW } from './window-provider';

export interface linkSettings {
    native?: boolean,
    from?: string,
    context?: {},
    command?: string,
    systemId?: string,
    action?: {},
    actionParameters?: {},
    auth?: boolean | string | undefined,
    code?: string | undefined,
    useOauth?: boolean
}

@Injectable({
    providedIn: 'root'
})
export class NxUrlProtocolService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(
        @Inject(WINDOW) private window: Window,
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    private parseSource() {
        // TODO: Clean up this after we retire AJS
        const search = this.window.location.search.replace('?', '').split('&');

        let fromLocation = '';
        const from = search.find(param => {
            return param.includes('from');
        });
        if (from) {
            fromLocation = from.split('=')[1];
        }

        let contextParam = '';
        const context = search.find(param => {
            return param.includes('context');
        });
        if (context) {
            contextParam = from.split('=')[1];
        }

        const source = {
            from: fromLocation || 'portal',
            context: contextParam || 'none',
            isApp: false
        };
        source.isApp = (source.from === 'client' || source.from === 'mobile');
        return source;
    }

    generateLink(linkSettings: linkSettings = {}) {
        let settings: linkSettings = {
            native: true,
            from: 'portal', // client, mobile, portal, webadmin
            context: undefined,
            command: 'client', // client, cloud, system
            systemId: undefined,
            action: undefined,
            actionParameters: {}, // Object with parameters
            auth: true, // true for request, null for skipping, string for specific value
            code: undefined
        };

        if (linkSettings.systemId) {
            settings.command = 'client';
        }

        settings = { ...settings, ...linkSettings };

        const protocol = settings.native && this.LANG.clientProtocol
            ? this.LANG.clientProtocol?.()
            : this.window.location.protocol;
        const host = this.window.location.host;

        const getParams: linkSettings = { ...settings.actionParameters };

        if (settings.from) {
            getParams.from = settings.from;
        }
        if (typeof settings.auth === 'string') {
            getParams.auth = settings.auth;
        }

        if (settings.context) {
            getParams.context = settings.context;
        }

        if (settings.code) {
            getParams.code = settings.code;
        }

        let url = `${protocol}//${host}/${settings.command}/`;
        if (linkSettings.systemId) {
            url += `${linkSettings.systemId}/`;
        }
        if (linkSettings.action) {
            url += linkSettings.action;
        }

        const uri = [];
        Object.keys(getParams).forEach(param => {
            uri.push(`${param}=${getParams[param]}`);
        });

        url += `?${uri.join('&')}`;

        return url;
    }

    getLink(
        linkSettings: linkSettings
    ): Promise<{
        link: string,
        authKey?: string | undefined,
        // eslint-disable-next-line camelcase
        code?: string
    }> {
        const auth = linkSettings.useOauth
            ? this.cloudApiService.getCode('*').toPromise()
            : this.accountService.authKey();

        return auth.then(data => {
            if (linkSettings.useOauth) {
                linkSettings.code = data.code;
            } else {
                linkSettings.auth = data;
            }
            const linkData: any = {
                link: this.generateLink(linkSettings)
            };
            if (linkSettings.useOauth) {
                linkData.code = data.code;
            } else {
                linkData.authKey = data;
            }
            return linkData;
        }).catch(() => ({
            link: this.generateLink(linkSettings)
        }));
    }

    open(systemId: string, useOauth: boolean) {
        return this.getLink({
            systemId, useOauth
        }).then((data: { link: string, authKey: string }) => {
            let link = data.link;
            const authKey = data.authKey;
            link = link.replace(/&/g, '&&'); // This is a hack,
            // Google Chrome for mac has a bug - he looses one ampersand which brakes the link parameters
            // Here we duplicate ampersands to keep one of them
            // Dear successor, if you read this - please, check if the bug was fixed in chrome and remove this
            // ugly thing!
            // see CLOUD-716 for more information

            // TODO: Add type to returned promise, low priority
            return new Promise<any>((resolve, reject) => {
                /* The browser opens a dialog that we cannot directly detect or get a response from.
                 * However, when the browser dialog opens it causes the page to blur so we use that to detect what
                 * happens.
                 */
                let blurCount = 0;
                let hasBlur = false; // Checks if the browser dialog opened.
                let hasOpened = false; // Open button was clicked.
                let hasOpenChecked = false; // Ensure that we only check on the first blur after we regain focus from the browser dialog.
                this.window.onblur = () => {
                    if (!this.window.document.hidden) {
                        blurCount++;
                    }
                };
                this.window.onfocus = () => {
                    if (hasBlur && !hasOpenChecked) {
                        hasOpenChecked = true;
                        // If the browser leaves focus right after coming back it means we probably tried to open the app via protocol.
                        // Doubtful most users will change apps or click out before a second has passed.
                        setTimeout(() => {
                            hasOpened = blurCount > 1;
                        }, 100);
                    }
                };
                // Browser dialog will cause a blur. If not then we never blurred.
                setTimeout(() => {
                    hasBlur = blurCount === 1;
                }, 100);

                // Check on before unload
                // @ts-expect-error
                this.window.protocolCheck(
                    link,
                    this.CONFIG.openClientTimeout,
                    this.CONFIG.openMobileClientTimeout,
                    () => {
                        this.accountService
                            .checkVisitedKey(authKey)
                            .then(visited => {
                                // On windows chrome actually fails so we can use the protocol error handler
                                this.window.onblur = undefined;
                                this.window.onfocus = undefined;
                                if (!visited && blurCount > 0) {
                                    return reject({ resultCode: this.CONFIG.openClientError });
                                }
                                return resolve(false);
                            });
                    },
                    () => {
                        setTimeout(() => {
                            this.accountService
                                .checkVisitedKey(authKey)
                                .then(visited => {
                                    this.window.onblur = undefined;
                                    this.window.onfocus = undefined;
                                    /* How the check works
                                     * !visited && !hasBlur && !hasOpened = The browser did not open the native dialog.
                                     * !visited && hasBlur && !hasOpened = The browser opened the native dialog, but the user didn't press anything.
                                     * !visited && hasBlur && hasOpened = The browser tried to open the app but could not find it.
                                     */
                                    if (!visited && (!hasBlur || hasOpened)) {
                                        return reject({ resultCode: this.CONFIG.openClientError });
                                    }
                                    return resolve(visited);
                                });
                        }, this.CONFIG.openClientTimeout);
                    });
            });
        });
    }

    getSource() {
        return this.parseSource();
    }
}
