import { Inject, Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { environment } from '@environments/environment';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxHeaderService } from './nx-header.service';
import { WINDOW } from './window-provider';

interface MetaLookup {
    [key: string]: Record<string, string>
}

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxPageService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    updater$ = new Subject();
    metaLookup: MetaLookup = {};
    defaultMetaKey = environment.isLocal ? 'metaDefaultsWebadmin' : 'metaDefaults';
    templateKey = environment.isLocal ? 'templateWebadmin' : 'template';

    constructor(
        configService: NxConfigService,
        private title: Title,
        private meta: Meta,
        private router: Router,
        headerService: NxHeaderService,
        translate: TranslateService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.updater$.pipe(
            untilDestroyed(this),
            debounceTime(50)
        ).subscribe(_ => {
            Object.entries(this.metaProperties).forEach(([name, content]) => {
                const property = `og:${name}`;
                this.meta.updateTag({ name, property, content });
                if (name === 'title' && !this.router.url.startsWith('/authorize')) {
                    this.title.setTitle(content);
                }
            });

            if (!this.metaProperties.title || this.metaProperties.title === this.LANG[this.defaultMetaKey].default.title() && !headerService?.currentLocation?.isSystem && headerService.currentLocation.childNode) {
                this.updateLookups('title', translate.instant(headerService.currentLocation.childNode.name) + ' - ' + this.LANG.productName());
            }
        });
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        )?.subscribe(this.updater$);
    }

    getRoot() {
        return this.window.location.href.replace(this.router.url, '');
    }

    mapMeta = (metaProperties: Record<string, any>) => Object.entries(metaProperties || {}).reduce((lookup, [property, val]) => ({ ...lookup, [property]: val() }), {});

    getBaseMeta() {
        const baseLangMeta = this.mapMeta(this.LANG[this.defaultMetaKey].default);
        const { image, type } = this.CONFIG.metaDefaults.default;
        return { ...baseLangMeta, type, image: this.getRoot() + image };
    }

    findMatchingMeta = url => (lookupDict): Record<string, any> => Object.entries(lookupDict).find(([partialPath]) => url.startsWith(partialPath))?.[1] || {};

    getPathMeta(url) {
        const findIn = this.findMatchingMeta(url);
        return {
            ...this.mapMeta(findIn(this.LANG[this.defaultMetaKey])),
            ...findIn(this.CONFIG.metaDefaults)
        };
    }

    generateDefaultMeta = (url: string): Record<string, string> => ({ ...this.getBaseMeta(), ...this.getPathMeta(url) });

    /**
     * Use this method to update a pages metadata.
     *
     * @param property string
     * @param value string
     */
    updateLookups(property, value): void {
        const { url } = this.router;
        this.metaLookup[url] ||= this.generateDefaultMeta(url);
        const urlProperties = this.metaLookup[url];
        if (value) {
            urlProperties[property] = value;
        }
        urlProperties.url = this.getRoot() + url;
        this.updater$.next('update');
    }

    /**
     * Get a pages current metadata
     */
    get metaProperties() {
        const url = this.router.url.split('?')[0];
        return this.metaLookup[url] || this.generateDefaultMeta(url);
    }

    /**
     * Updates a pages metadata from an object. If only partial metadata is provided fallbacks are used for the others.
     */
    set metaProperties(properties) {
        Object.entries(properties).forEach(args => this.updateLookups(...args));
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
        if (this.router.url === '/authorize') {
            return;
        }
        const txt = (typeof title === 'function') ? title() : title;
        if (this.LANG && this.LANG.pageTitles && txt !== this.LANG.productName()) {
            this.updateLookups('title', this.LANG.pageTitles[this.templateKey]({ title: txt }));
            return;
        }
        this.updateLookups('title', txt);
    }

    public get pageDescription() {
        return this.meta.getTag('description');
    }

    public set pageDescription(content: any) {
        this.updateLookups('description', content);
    }

    public get pageTitleRemoveHyphen() {
        return this.title.getTitle().replace('- ', '');
    }

    public set pageTitleRemoveHyphen(title: any) {
        if (this.LANG && title !== this.LANG.productName()) {
            const txt = (typeof title === 'function') ? title() : title;
            this.updateLookups('title', this.LANG.pageTitles[this.templateKey]({ title: txt }).replace('- ', ''));
            return;
        }
        this.updateLookups('title', title());
    }

    setDefaultLayout(): void {
        this.updateLookups('viewport', this.CONFIG.meta.viewport.default);
    }

    setDesktopLayout(): void {
        this.updateLookups('viewport', this.CONFIG.meta.viewport.desktopLayout);
    }

    public show404 = (message = ''): void => {
        const queryParams: Record<string, string> = {};

        if (message) {
            queryParams.message = message;
        }

        this.router
            .navigate([this.CONFIG.redirect.page404], {
                replaceUrl: true,
                queryParams
            })
            .catch(error => {
                console.error(error);
            });
    };
}
