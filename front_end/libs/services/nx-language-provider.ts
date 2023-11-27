import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { i18n } from 'dateformat';
import { LocalStorageService } from 'ngx-webstorage';

import { ToastType } from '@components/toast-container/toast.types';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxSwCacheService } from '@services/sw-cache.service';
import { NxToastService } from '@services/toast.service';
import { NxUriCacheService } from '@services/uri-cache.service';
import { Language, processLanguageFactory } from '@utils/nx';

import { nxConfig } from './nx-config/config';
import { IConfig } from './nx-config/config-types';
import { NxSessionService } from './session.service';

const i18nOriginal = { ...i18n };

@Injectable({
    providedIn: 'root',
})
export class NxLanguageProviderService {
    CONFIG: IConfig = nxConfig;
    constructor(
        public translate: TranslateService,
        private http: HttpClient,
        private cloudApi: NxCloudApiService,
        private toastService: NxToastService,
        private sessionService: NxSessionService,
        private storageService: LocalStorageService,
        public cacheService: NxUriCacheService,
        public swCacheService: NxSwCacheService,
    ) {
        this.defaultLanguage = this.CONFIG.defaultLanguage;

        if (environment.isWizard) {
            const lang = new URLSearchParams(window.location.search).get('lang');
            this.currentLang = lang ?? this.translate.getDefaultLang();
        }

        if (environment.isLocal && !environment.isWizard) {
            // Fixes circular dependency with local-system-status-interceptor.
            setTimeout(() => {
                this.currentLang = this.sessionService.language;
            });
        }

        this.storageService.observe('language').subscribe(_ => {
            // webadmin will handle the reload
            if (!environment.isLocal && !document.hasFocus()) {
                window.location.reload();
            }
        });

        /** Breadcrumbs -- to avoid page reload on language change
         * this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
         * });
         * this.translate.onTranslationChange.subscribe((event: TranslationChangeEvent) => {
         * });
         */
    }

    loadLanguage(): Promise<Language> {
        const lang = this.currentLang ?? this.translate.getDefaultLang();
        return (
            environment.isLocal
                ? this.http.get<Language>(`/static/lang_${lang}/language_compiled.json`)
                : this.http.get<Language>('/api/utils/language')
        ).toPromise();
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

    setTranslations(lang: string, translation: Language): void {
        // language fail may have special character or
        // syntax error ... like use of double curly braces
        try {
            this.translate.setTranslation(lang, this.processLanguage(translation));
            this.translate.use(lang); // this will tell TranslateService to switch language -> see "breadcrumbs"
            const productName =
                staticLang?.[environment.isLocal ? 'metaDefaultsWebadmin' : 'metaDefaults']?.default
                    ?.site_name || '';
            this.translate.set('productName', productName);
        } catch (e) {
            this.toastService.notify(
                'Loaded default language due to an error while setting up desired language.',
                ToastType.Warning,
            );
            this.cloudApi.changeLanguage(this.translate.getDefaultLang()).then(() => {
                this.currentLang = this.translate.getDefaultLang();
            });
        }
    }

    public get defaultLanguage(): string {
        return this.translate.defaultLang;
    }

    public set defaultLanguage(language: string) {
        this.translate.setDefaultLang(language);
    }

    public get currentLang(): string {
        return this.translate.currentLang;
    }

    public set currentLang(language: string) {
        // avoid undefined "language"
        if (
            !language ||
            (language === this.translate.currentLang && this.sessionService.language === language)
        ) {
            return;
        }

        this.translate.currentLang = language;
        this.loadLanguage().then(translation => {
            this.setTranslations(language, translation);
            this.sessionService.language = language;
        });

        this.cacheService.clearData();
        this.swCacheService.clearAllCache().catch(err => console.error(err));
    }

    /** e.g. en_US => en-US */
    get currentLocale(): string {
        return this.currentLang.replace('_', '-');
    }

    private processLanguage(translations: Language): Language {
        const customStrings = {
            '%CLOUD_NAME%': this.CONFIG.cloudName,
            '%VMS_NAME%': this.CONFIG.vmsName,
            '%CLIENT_PROTOCOL%': this.CONFIG.clientProtocol,
            '%PRIVACY_LINK%': this.CONFIG.company.links.privacy,
            '%SUPPORT_LINK%': this.CONFIG.company.links.website,
            '%COMPANY_NAME%': this.CONFIG.company.name,
            '%ANDROID_APPLICATION_LINK%': this.CONFIG.mobileLinks?.android_application_link,
            '%IOS_APPLICATION_LINK%': this.CONFIG.mobileLinks?.ios_application_link,
        };
        return processLanguageFactory(customStrings)(translations);
    }
}
