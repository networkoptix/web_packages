import { Inject, Injectable } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { protocolCheck } from '@utils/protocolcheck';

import { NxAccountService } from './account.service';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';
import type { LinkSettings } from './url-protocol.service.types';
import { WINDOW } from './window-provider';

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

    generateLink(linkSettings: LinkSettings = {}) {
        let settings: LinkSettings = {
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

        const getParams: LinkSettings = { ...settings.actionParameters };

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
        linkSettings: LinkSettings
    ): Promise<{
        link: string,
        authKey?: string | undefined,
        code?: string
    }> {
        return Promise.all([
            linkSettings.useOauth ? Promise.resolve('') : this.accountService.authKey(),
            this.cloudApiService.getCode('*').toPromise()
        ]).then(([data, { code }]) => {
            if (linkSettings.useOauth) {
                linkSettings.code = code;
            } else {
                linkSettings.auth = data;
                linkSettings.code = code;
            }
            const linkData: any = {
                link: this.generateLink(linkSettings)
            };
            if (linkSettings.useOauth) {
                linkData.code = code;
            } else {
                linkData.authKey = data;
                linkData.code = code;
            }
            return linkData;
        }).catch(() => ({
            link: this.generateLink(linkSettings)
        }));
    }

    open(systemId: string, useOauth: boolean) {
        return this.getLink({
            systemId, useOauth
        }).then(({ link }) => {
            if (!environment.production) {
                link = link
                    .replace(this.LANG.clientProtocol(), 'nx-vms:')
                    .replace(this.window.location.host, environment.cloudHost);
            }
            /* The browser opens a dialog that we cannot directly detect or get a response from.
             * However, when the browser dialog opens it causes the page to blur so we use that to detect what happens.
             */
            return new Promise<void>((resolve, reject) => {
                protocolCheck(
                    link,
                    () => {
                        resolve();
                    },
                    () => {
                        reject({ resultCode: this.CONFIG.openClientError });
                    },
                    this.CONFIG.openClientTimeout,
                    this.CONFIG.openMobileClientTimeout,
                );
            });
        });
    }

    getSource() {
        return this.parseSource();
    }
}
