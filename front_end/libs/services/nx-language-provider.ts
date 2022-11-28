import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { i18n } from 'dateformat';
import { LocalStorageService } from 'ngx-webstorage';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSwCacheService } from '@services/sw-cache.service';
import { NxUriCacheService } from '@services/uri-cache.service';

import { NxSessionService } from './session.service';
import { WINDOW } from './window-provider';

const i18nOriginal = { ...i18n };

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {
    constructor(
        configService: NxConfigService,
        private translate: TranslateService,
        private http: HttpClient,
        private sessionService: NxSessionService,
        private storageService: LocalStorageService,
        private cacheService: NxUriCacheService,
        private swCacheService: NxSwCacheService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.defaultLanguage = configService.getConfig().defaultLanguage;

        if (environment.isSetup) {
            const lang = new URLSearchParams(this.window.location.search).get('lang');
            this.currentLang = lang ?? this.translate.getDefaultLang();
        }

        if (environment.isLocal && !environment.isSetup) {
            // Fixes circular dependency with local-system-status-interceptor.
            setTimeout(() => {
                this.currentLang = this.sessionService.language;
            });
        }

        this.storageService.observe('language').subscribe(_ => {
            // webadmin will handle the reload
            if (!environment.isLocal && !this.window.document.hasFocus()) {
                this.window.location.reload();
            }
        });

        /** Breadcrumbs -- to avoid page reload on language change
         * this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
         * });
         * this.translate.onTranslationChange.subscribe((event: TranslationChangeEvent) => {
         * });
        */
    }

    loadLanguage() {
        const lang = this.translate.currentLang ?? this.translate.getDefaultLang();

        return (environment.isLocal
            ? this.http.get(`/static/lang_${lang}/language_compiled.json`)
            : this.http.get('/api/utils/language')).toPromise();
    }

    loadTimelineTranslations(): void {
        const timelineTranslations = staticLang?.view?.timeline;
        if (!timelineTranslations) {
            return;
        }
        Object.entries(i18nOriginal).forEach(([k, v]: [string, string[]]) => {
            const translations = this.translate.instant(v);
            i18n[k] = v.map(s => translations[s]);
        });
    }

    setTranslations(lang: string, translation): void {
        this.translate.setTranslation(lang, translation);
        this.translate.use(lang); // this will tell TranslateService to switch language -> see "breadcrumbs"
        const productName = staticLang?.[environment.isLocal ? 'metaDefaultsWebadmin' : 'metaDefaults']?.default?.site_name || '';
        this.translate.set('productName', productName);
    }

    public get defaultLanguage() {
        return this.translate.defaultLang;
    }

    public set defaultLanguage(language: string) {
        this.translate.setDefaultLang(language);
    }

    public get currentLang() {
        return this.translate.currentLang;
    }

    public set currentLang(language: string) {
        // avoid undefined "language"
        if (!language || language === this.translate.currentLang) {
            return;
        }

        this.translate.currentLang = language;
        this.loadLanguage().then(translation => {
            this.setTranslations(language, translation);
            this.sessionService.language = language;
        });

        this.cacheService.clearData();
        this.swCacheService
            .clearAllCache()
            .catch(err => console.error(err));
    }
}
