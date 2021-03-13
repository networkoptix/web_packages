import { Injectable }               from '@angular/core';
import { Title, Meta }              from '@angular/platform-browser';
import { Router }                   from '@angular/router';

import { NxConfigService, IConfig } from './nx-config';
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
        private meta: Meta,
        private router: Router
    ) {
        this.CONFIG = configService.getConfig();
    }

    // called from app component
    public get newLanguage() {
        return this.LANG;
    }

    public set newLanguage(language: LanguageI18NStaticTypes) {
        this.LANG = language;
    }

    public get pageTitle() {
        return this.title.getTitle();
    }

    public set pageTitle(title: any) {
        const txt = (typeof title === 'function') ? title() : title;
        if (this.LANG && this.LANG.pageTitles && txt !== this.LANG.pageTitles.default()) {
            this.title.setTitle(this.LANG.pageTitles.template({ title: txt }));
            return;
        }
        this.title.setTitle(txt);
    }

    public get pageDescription() {
        return this.meta.getTag('description');
    }

    public set pageDescription(content: any) {
        this.meta.updateTag({ name: 'description', content: content });
    }

    public get pageTitleRemoveHyphen() {
        return this.title.getTitle().replace('- ', '');
    }

    public set pageTitleRemoveHyphen(title: any) {
        if (this.LANG && this.LANG.pageTitles && title !== this.LANG.pageTitles.default?.()) {
            const txt = (typeof title === 'function') ? title() : title;
            this.title.setTitle(this.LANG.pageTitles.template({ title: txt }).replace('- ', ''));
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

    public show404() {
        this.router
            .navigate([this.CONFIG.redirect.page404], {
                replaceUrl: true
            })
            .catch(error => {
                console.error(error);
            });
    }
}
