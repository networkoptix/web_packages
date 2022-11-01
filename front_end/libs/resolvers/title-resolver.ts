import { Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageMetaService } from '@services/page-meta.service';

@Injectable({ providedIn: 'root' })
export class NxPageTitleStrategy extends TitleStrategy {
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private pageMetaService : NxPageMetaService,
    ) {
        super();

        this.CONFIG = configService.getConfig();
    }

    override updateTitle(routerState: RouterStateSnapshot): void {
        const lang = this.languageService.translations;
        let title = this.buildTitle(routerState);
        let description: string;

        if (title) {
            try {
                const titleObj = JSON.parse(title);
                switch (titleObj.type) {
                    case 'product':
                        title = lang.productName();
                        break;
                    case 'system':
                        title = titleObj.baseTitle
                            ? `${titleObj.baseTitle} - ${lang.productName()}`
                            : lang.productName();
                        break;
                    default:
                        const mod = titleObj.modifier
                            ? `${lang.downloads.groups[titleObj.modifier].label()}`
                            : ` - ${lang.productName()}`;

                        title = lang.pageTitles[titleObj.baseTitle]() + mod;
                        break;
                }

                if (titleObj.descr) {
                    description = this.CONFIG[titleObj.descr[0]];
                    for (let idx = 1; idx < titleObj.descr.length; idx++) {
                        description = description[titleObj.descr[idx]];
                    }
                }
            } catch (ex) {
                title = `${lang.pageTitles[title]()} - ${lang.productName()}`;
            }
        } else {
            title = lang.metaDefaults.default.title();
        }

        description = description ?? lang.metaDefaults.default.description();
        this.pageMetaService.setMetaProperties(routerState.url, { title, description });
    }
}
