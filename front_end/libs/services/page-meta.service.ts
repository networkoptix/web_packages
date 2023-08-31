import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { environment } from '@environments/environment';
import staticLang from '@language_static';

import type { BaseConfig } from './nx-config/base-config';
import { nxConfig } from './nx-config/config';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { windowFactory } from './window-provider';

interface MetaLookup {
    [key: string]: Record<string, string>;
}

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class NxPageMetaService {
    CONFIG: IConfig = nxConfig;
    LANG = staticLang;
    protected window: Window = windowFactory();

    routerUrl: string = '';
    updater$ = new Subject<void>();
    metaLookup: MetaLookup = {};
    defaultMetaKey = environment.isLocal ? 'metaDefaultsWebadmin' : 'metaDefaults';
    templateKey = environment.isLocal ? 'templateWebadmin' : 'template';

    constructor(
        configService: NxConfigService,
        private translateService: TranslateService,
        protected readonly title: Title,
        protected readonly meta: Meta,
    ) {
        this.CONFIG = configService.getConfig();

        this.updater$.pipe(untilDestroyed(this), debounceTime(50)).subscribe(_ => {
            Object.entries(this.getMetaProperties()).forEach(([name, content]) => {
                const property = `og:${name}`;
                this.meta.updateTag({ name, property, content });
                if (name === 'title' && !this.routerUrl.startsWith('/authorize')) {
                    this.title.setTitle(content);
                }
            });
        });
    }

    private getRoot(): string {
        return this.window.location.href.replace(this.routerUrl, '');
    }

    private mapMeta = (metaProperties: Record<string, string>): Record<string, string> => {
        return Object.entries(metaProperties || {}).reduce((lookup, [property, val]) => {
            val = this.translateService.instant(val);
            return { ...lookup, [property]: val };
        }, {});
    };

    private getBaseMeta(): Record<string, string> {
        const baseLangMeta = this.mapMeta(this.LANG[this.defaultMetaKey].default);
        const { image, type } = this.CONFIG.metaDefaults.default;
        return { ...baseLangMeta, type, image: this.getRoot() + image };
    }

    private findMatchingMeta = (url: string) => {
        return (lookupDict: BaseConfig['metaDefaults']) => {
            return (
                Object.entries(lookupDict).find(([partialPath]) => {
                    return url.startsWith(partialPath);
                })?.[1] || {}
            );
        };
    };

    private getPathMeta(url: string): Record<string, string> {
        const findIn = this.findMatchingMeta(url);
        return {
            ...this.mapMeta(findIn(this.LANG[this.defaultMetaKey])),
            ...findIn(this.CONFIG.metaDefaults),
        };
    }

    private generateDefaultMeta = (url: string): Record<string, string> => {
        return { ...this.getBaseMeta(), ...this.getPathMeta(url) };
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
        this.updater$.next();
    }

    /**
     * Get a pages current metadata
     */
    getMetaProperties(): Record<string, string> {
        const url = this.routerUrl.split('?')[0];
        return this.metaLookup[url] || this.generateDefaultMeta(url);
    }

    /**
     * Updates a pages metadata from an object. If only partial metadata is provided fallbacks are used for the others.
     */
    setMetaProperties(url: string, properties: Record<string, string>): void {
        this.routerUrl = url.split('?')[0];
        Object.entries(properties).forEach(args => this.updateLookups(...args));
    }
}
