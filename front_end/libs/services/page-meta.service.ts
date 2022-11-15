import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
// import { NxHeaderService } from './nx-header.service';
import { WINDOW } from './window-provider';

interface MetaLookup {
    [key: string]: Record<string, string>
}

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxPageMetaService {
    CONFIG: IConfig;
    LANG = staticLang;

    routerUrl: string = '';
    updater$ = new Subject<unknown>();
    metaLookup: MetaLookup = {};
    defaultMetaKey = environment.isLocal ? 'metaDefaultsWebadmin' : 'metaDefaults';
    templateKey = environment.isLocal ? 'templateWebadmin' : 'template';

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        protected readonly title: Title,
        protected readonly meta: Meta,
        // headerService: NxHeaderService,
        @Inject(WINDOW) protected window: Window
    ) {
        this.CONFIG = configService.getConfig();

        this.updater$.pipe(
            untilDestroyed(this),
            debounceTime(50)
        ).subscribe(_ => {
            Object.entries(this.getMetaProperties()).forEach(([name, content]) => {
                const property = `og:${name}`;
                this.meta.updateTag({ name, property, content });
                if (
                    name === 'title' &&
                    !this.routerUrl.startsWith('/authorize')
                ) {
                    this.title.setTitle(content);
                }
            });
        });
    }

    private getRoot(): string {
        return this.window.location.href.replace(this.routerUrl, '');
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private mapMeta = (metaProperties: Record<string, () => string>) => {
        return Object.entries(metaProperties || {})
            .reduce((lookup, [property, val]) => {
                return ({ ...lookup, [property]: val });
            }, {});
    };

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private getBaseMeta() {
        const baseLangMeta = this.mapMeta(this.LANG[this.defaultMetaKey].default);
        const { image, type } = this.CONFIG.metaDefaults.default;
        return { ...baseLangMeta, type, image: this.getRoot() + image };
    }

    private findMatchingMeta = (url: string) => {
        // eslint-disable-next-line
        return (lookupDict): Record<string, any> => {
            return Object.entries(lookupDict).find(([partialPath]) => url.startsWith(partialPath))?.[1] || {};
        };
    };

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type,nx/no-untyped-arg
    private getPathMeta(url) {
        const findIn = this.findMatchingMeta(url);
        return {
            ...this.mapMeta(findIn(this.LANG[this.defaultMetaKey])),
            ...findIn(this.CONFIG.metaDefaults)
        };
    }

    private generateDefaultMeta = (url: string): Record<string, string> => {
        return ({ ...this.getBaseMeta(), ...this.getPathMeta(url) });
    };

    /**
     * Use this method to update a pages metadata.
     *
     * @param property string
     * @param value string
     */
    updateLookups(property: string, value: string): void {
        const defaultMeta = this.generateDefaultMeta(this.routerUrl);
        this.metaLookup[this.routerUrl] ||= defaultMeta;
        const urlProperties = this.metaLookup[this.routerUrl];
        if (value) {
            urlProperties[property] = value;
        }
        urlProperties.url = this.getRoot() + this.routerUrl;
        this.updater$.next('update');
    }

    /**
     * Get a pages current metadata
     */
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    getMetaProperties() {
        const url = this.routerUrl.split('?')[0];
        return this.metaLookup[url] || this.generateDefaultMeta(url);
    }

    /**
     * Updates a pages metadata from an object. If only partial metadata is provided fallbacks are used for the others.
     */
    setMetaProperties(url: string, properties: Record<string, string>): void {
        this.routerUrl = url;
        Object.entries(properties).forEach(args => this.updateLookups(...args));
    }
}
