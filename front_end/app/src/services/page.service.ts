import { Inject, Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
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

    constructor(
        configService: NxConfigService,
        private title: Title,
        private meta: Meta,
        private router: Router,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.updater$.pipe(
            untilDestroyed(this),
            debounceTime(50)
        ).subscribe(_ => {
            const meta = this.metaLookup[this.router.url];
            Object.entries(meta || {}).forEach(([name, content]) => {
                const property = `og:${name}`;
                this.meta.updateTag({ name, property, content });
                if (name === 'title') {
                    this.title.setTitle(content);
                }
            });
        });
    }

    getRoot() {
        return this.window.location.href.replace(this.router.url, '');
    }

    mapMeta = (metaProperties: Record<string, any>) => Object.entries(metaProperties || {}).reduce((lookup, [property, val]) => ({ ...lookup, [property]: val() }), {});

    getBaseMeta() {
        const baseLangMeta = this.mapMeta(this.LANG.metaDefaults.default);
        const { image, type } = this.CONFIG.metaDefaults.default;
        return { ...baseLangMeta, type, image: this.getRoot() + image };
    }

    findMatchingMeta = url => (lookupDict): Record<string, any> => Object.entries(lookupDict).find(([partialPath]) => url.startsWith(partialPath))?.[1] || {};

    getPathMeta(url) {
        const findIn = this.findMatchingMeta(url);
        return {
            ...this.mapMeta(findIn(this.LANG.metaDefaults)),
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
    updateLookups(property, value) {
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
        const { url } = this.router;
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
        const txt = (typeof title === 'function') ? title() : title;
        if (this.LANG && this.LANG.pageTitles && txt !== this.LANG.pageTitles.default()) {
            this.updateLookups('title', this.LANG.pageTitles.template({ title: txt }));
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
        if (this.LANG && this.LANG.pageTitles && title !== this.LANG.pageTitles.default?.()) {
            const txt = (typeof title === 'function') ? title() : title;
            this.updateLookups('title', this.LANG.pageTitles.template({ title: txt }).replace('- ', ''));
            return;
        }
        this.updateLookups('title', title());
    }

    setDefaultLayout() {
        this.updateLookups('viewport', this.CONFIG.meta.viewport.default);
    }

    setDesktopLayout() {
        this.updateLookups('viewport', this.CONFIG.meta.viewport.desktopLayout);
    }

    public show404 = () => {
        this.router
            .navigate([this.CONFIG.redirect.page404], {
                replaceUrl: true
            })
            .catch(error => {
                console.error(error);
            });
    };
}
