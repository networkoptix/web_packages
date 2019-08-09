import { Inject, Injectable }        from '@angular/core';
import { HttpClient }                from '@angular/common/http';
import { Observable }                from 'rxjs';
import { NxConfigService }           from './nx-config';
import { Location }                  from '@angular/common';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxAccountService }          from './account.service';
import { WINDOW }                    from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxUrlProtocolService {
    CONFIG: any;
    LANG: any;

    location: any;


    constructor(@Inject(WINDOW) private window: Window,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private accountService: NxAccountService,
                location: Location,
    ) {
        this.CONFIG = config.getConfig();
        this.LANG = this.language.getTranslations();
        this.location = location;
    }

    private parseSource() {
        const search = this.location.search();
        const source = {
            from   : search.from || 'portal',
            context: search.context || 'none',
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

        const protocol = settings.native ? this.LANG.clientProtocol : this.location.protocol;
        const host = this.location.host;

        let getParams;
        getParams = { actionParameters: settings.actionParameters };

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

        let uri;
        getParams.forEach((param) => {
            uri += '&' + param;
        });

        url += '?' + getParams.substring(1);

        return url;
    }

    getLink(linkSettings) {
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

            // TODO: this is called without any callback function ... do we really need it?
            // this.window.protocolCheck(link);

            return setTimeout(() => {
                return this.accountService
                        .checkVisitedKey(authKey)
                        .then((visited) => {
                           if (!visited) {
                               return Promise.reject(visited);
                           }
                           return visited;
                       });
            }, this.CONFIG.openClientTimeout);
        });
    }

    getSource() {
        return this.parseSource();
    }
}
