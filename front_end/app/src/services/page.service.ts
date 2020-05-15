import { Injectable }               from '@angular/core';
import { NxConfigService, IConfig } from './nx-config';
import { Title, Meta }              from '@angular/platform-browser';
import { LanguageI18NStaticTypes }  from '../../language_i18n_static_types';

@Injectable({
    providedIn: 'root'
})
export class NxPageService {
    private CONFIG: IConfig;
    private LANG: LanguageI18NStaticTypes;

    constructor(
        configService: NxConfigService,
        private title: Title,
        private meta: Meta
    ) {
        this.CONFIG = configService.getConfig();
    }

    // called from app component
    public set newLanguage(language: LanguageI18NStaticTypes) {
        this.LANG = language;
    }

    public set pageTitle(title: any) {
        if (this.LANG && this.LANG.pageTitles && title !== this.LANG.pageTitles.default) {
            this.title.setTitle(this.LANG.pageTitles.template({ title: title() }));
            return;
        }
        this.title.setTitle(title());
    }

    public set pageTitleRemoveHyphen(title: any) {
        if (this.LANG && this.LANG.pageTitles && title !== this.LANG.pageTitles.default) {
            this.title.setTitle(this.LANG.pageTitles.template({ title: title() }).replace('- ', ''));
            return;
        }
        this.title.setTitle(title());
    }

    setDefaultLayout() {
        this.meta.updateTag({ name: 'viewport', content: this.CONFIG.meta.viewport.default });
    }

    setDesktopLayout() {
        this.meta.updateTag({ name: 'viewport', content: this.CONFIG.meta.viewport.desktopLayout });
    }
}
