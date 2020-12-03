import { Injectable }               from '@angular/core';
import { NxConfigService, IConfig } from './nx-config';
import { Title, Meta }              from '@angular/platform-browser';
import { LanguageI18NStaticTypes }  from '../../language_i18n_static_types';

@Injectable({
    providedIn: 'root'
})
export class NxPageService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

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

    public set pageTitle(title: string) {
        if (this.LANG && this.LANG.pageTitles && title !== this.LANG.pageTitles.default) {
            title = this.LANG.pageTitles.template.replace('{{title}}', title);
        }
        this.title.setTitle(title);
    }

    public set pageDescription(content: string) {
        this.meta.updateTag({ name: 'description', content: content });
    }

    public set pageTitleRemoveHyphen(title: string) {
        if (this.LANG && this.LANG.pageTitles && title !== this.LANG.pageTitles.default) {
            title = this.LANG.pageTitles.template
                .replace('{{title}}', title)
                .replace('- ', '');
        }
        this.title.setTitle(title);
    }

    setDefaultLayout() {
        this.meta.updateTag({ name: 'viewport', content: this.CONFIG.meta.viewport.default });
    }

    setDesktopLayout() {
        this.meta.updateTag({ name: 'viewport', content: this.CONFIG.meta.viewport.desktopLayout });
    }
}
