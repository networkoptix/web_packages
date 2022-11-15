import { Location } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import type { RouteCheckTuple } from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-404',
    styleUrls: ['404.component.scss'],
    templateUrl: '404.component.html'
})
export class Nx404Component {
    LANG = staticLang;
    CONFIG: IConfig;
    environment = environment;
    redirecting = true;
    message = '';

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private location: Location,
        private toastService: NxToastService,
        private translate: TranslateService,
        @Inject(WINDOW) private window: Window,
        configService: NxConfigService
    ) {
        this.CONFIG = configService.config;

        if (this.environment.isLocal && !this.route.snapshot.queryParams.redirected) {
            this.handleRedirect(this.location.path(true));
        } else {
            this.message = this.route.snapshot.queryParams.message || '';
            this.redirecting = false;
        }
    }

    getAdditionalMessage(key: string): string {
        const defaultKey = 'redirects.defaultMessage';
        const additionalMessages: Record<string, string> =
            this.translate.instant([key, defaultKey]);
        const translatedCustom = additionalMessages[key];
        const translatedDefault = additionalMessages[defaultKey];

        return translatedCustom !== key ? translatedCustom : translatedDefault;
    }

    routeChecker = (url: string): RouteCheckTuple => {
        return this.CONFIG.webadminRoutesLookup.find(routeTuple => {
            const [checker] = routeTuple;
            return checker.test(
                url.split('/').filter(segment => segment).join('/')
            );
        }) || [];
    };

    handleRedirect(url: string): void {
        let [_, redirectUrl, customMessage = 'redirects.defaultMessage'] = this.routeChecker(url);

        if (redirectUrl) {
            // translatedLink would contain links from cloud portal
            const key = `redirects.cloudLinks.${redirectUrl}`;
            const translatedLink = this.translate.instant(key).replace(key, '');

            if (!redirectUrl.startsWith('/')) {
                redirectUrl = '/';
                if (translatedLink) {
                    // Open if redirect link found in translations
                    this.window.open(translatedLink, '_blank');
                } else {
                    // Else return to show 404
                    this.redirecting = false;
                    return;
                }
            }
            this.router.navigate([redirectUrl], { relativeTo: this.route, replaceUrl: true, queryParams: { redirected: url } }).then(_ => {
                const { origin } = this.window.location;
                const redirectMessage = this.translate.instant(
                    'redirects.message',
                    {
                        url: `${origin}/#${url}`,
                        redirectUrl: translatedLink || `${origin}/#${redirectUrl}`
                    });
                const additionalMessage = this.getAdditionalMessage(customMessage);
                this.toastService.notify(
                    `${redirectMessage} ${additionalMessage}`,
                    this.CONFIG.toast.info,
                    this.CONFIG.longAlertTimeout,
                );
            });
        }
    }
}
