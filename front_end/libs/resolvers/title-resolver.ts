import { Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageMetaService } from '@services/page-meta.service';

@Injectable({ providedIn: 'root' })
export class NxPageTitleStrategy extends TitleStrategy {
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private translateService: TranslateService,
        private pageMetaService: NxPageMetaService,
    ) {
        super();

        this.CONFIG = configService.getConfig();
    }

    override updateTitle(routerState: RouterStateSnapshot): void {
        const lang = staticLang;
        let title = this.buildTitle(routerState);
        let description: string;

        if (title) {
            const productName = this.translateService.instant(lang.productName || '%CLOUD_NAME%');
            try {
                const titleObj = JSON.parse(title);
                switch (titleObj.type) {
                    case 'product':
                        title = productName;
                        break;
                    case 'system':
                        title = titleObj.baseTitle
                            ? `${this.translateService.instant(
                                  titleObj.baseTitle,
                              )} - ${productName}`
                            : productName;
                        break;
                    default:
                        const mod = titleObj.modifier
                            ? `${this.translateService.instant(
                                  lang.downloads.groups[titleObj.modifier].label,
                              )}`
                            : ` - ${productName}`;
                        const baseTitle = `${lang.pageTitles?.[titleObj.baseTitle] || titleObj}`;
                        if (baseTitle) {
                            title = this.translateService.instant(baseTitle) + mod;
                        }
                        break;
                }

                if (titleObj.descr) {
                    description = this.CONFIG[titleObj.descr[0]];
                    for (let idx = 1; idx < titleObj.descr.length; idx++) {
                        description = description[titleObj.descr[idx]];
                    }
                }
            } catch (ex) {
                title = `${this.translateService.instant(lang.pageTitles[title])} - ${productName}`;
            }
        } else {
            title = this.translateService.instant(lang.metaDefaults.default.title);
        }

        if (description?.length) {
            description = this.translateService.instant(description);
        } else {
            description = this.translateService.instant(lang.metaDefaults.default.description);
        }
        this.pageMetaService.setMetaProperties(routerState.url, { title, description });
    }
}
