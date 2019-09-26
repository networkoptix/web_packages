import { Inject, Injectable }        from '@angular/core';
import { NxConfigService }           from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxAccountService }          from './account.service';
import { WINDOW }                    from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxUrlProtocolService {
    CONFIG: any;
    LANG: any;

    constructor(@Inject(WINDOW) private window: Window,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private accountService: NxAccountService,
    ) {
        this.CONFIG = config.getConfig();
        this.LANG = this.language.getTranslations();
    }

    private parseSource() {
        // TODO: Clean up this after we retire AJS
        const search = this.window.location.search.replace('?', '').split('&');

        let fromLocation = '';
        const from = search.find((param) => {
            return param.indexOf('from') >= 0;
        });
        if (from) {
            fromLocation = from.split('=')[1];
        }

        let contextParam = '';
        const context = search.find((param) => {
            return param.indexOf('context') >= 0;
        });
        if (context) {
            contextParam = from.split('=')[1];
        }

        const source = {
            from   : fromLocation || 'portal',
            context: contextParam || 'none',
            isApp  : false
        };
        source.isApp = (source.from === 'client' || source.from === 'mobile');
        return source;
    }

    generateLink(linkSettings) {
        linkSettings = linkSettings || {};
        let settings = {
            native          : true,
            from            : 'portal',    // client, mobile, portal, webadmin
            context         : undefined,
            command         : 'client', // client, cloud, system
            systemId        : undefined,
            action          : undefined,
            actionParameters: {}, // Object with parameters
            auth            : true // true for request, null for skipping, string for specific value
        };

        if (linkSettings.systemId) {
            settings.command = 'client';
        }

        settings = {...settings, ...linkSettings};

        const protocol = settings.native && this.LANG.clientProtocol ? this.LANG.clientProtocol : this.window.location.protocol;
        const host = this.window.location.host;

        let getParams;
        getParams = {...settings.actionParameters};

        if (settings.from) {
            getParams.from = settings.from;
        }
        if (settings.auth) {
            getParams.auth = settings.auth;
        }

        if (settings.context) {
            getParams.context = settings.context;
        }

        let url = protocol + '//' + host + '/' + settings.command + '/';
        if (linkSettings.systemId) {
            url += linkSettings.systemId + '/';
        }
        if (linkSettings.action) {
            url += linkSettings.action;
        }

        const uri = [];
        Object.keys(getParams).forEach((param) => {
            uri.push(param + '=' + getParams[param]);
        });

        const uriStr = uri.join('&');

        url += '?' + uriStr;

        return url;
    }

    getLink(linkSettings): Promise<any> {
        return new Promise((resolve, reject) => {
            this.accountService
                    .authKey()
                    .then((authKey) => {
                        linkSettings.auth = authKey;
                        resolve({
                            link: this.generateLink(linkSettings),
                            authKey
                        });
                    }).catch(() => {
                        resolve({
                            link: this.generateLink(linkSettings),
                            authKey: undefined
                        });
                    });
            });
        }

    open(systemId) {
        return this.getLink({
            systemId
        }).then((data: any) => {
            let link = data.link;
            const authKey = data.authKey;
            link = link.replace(/&/g, '&&'); // This is a hack,
            // Google Chrome for mac has a bug - he looses one ampersand which brakes the link parameters
            // Here we duplicate ampersands to keep one of them
            // Dear successor, if you read this - please, check if the bug was fixed in chrome and remove this
            // ugly thing!
            // see CLOUD-716 for more information

            return new Promise<any>((resolve, reject) => {
                // If the user clicks open the window will blur twice or more.
                // Otherwise the window will blur only once meaning it was canceled.
                let blurCount = 0;
                this.window.onblur = (event) => {
                    blurCount += 1;
                };
                // Check on before unload
                // @ts-ignore
                this.window.protocolCheck(link, (_) => reject(), () => {
                    setTimeout(() => {
                        this.accountService
                            .checkVisitedKey(authKey)
                            .then((visited) => {
                                this.window.onblur = undefined;
                                if (!visited && blurCount > 1) {
                                    return reject(visited);
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
