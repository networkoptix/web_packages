import { Inject, Injectable }      from '@angular/core';
import { HttpClient }              from '@angular/common/http';
import { BehaviorSubject }         from 'rxjs';
import { TranslateService }        from '@ngx-translate/core';
import { environment }             from '@environments/environment';
import { NxCloudApiService }       from './nx-cloud-api';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxSessionService }        from './session.service';
import { LocalStorageService }     from 'ngx-webstorage';
import { WINDOW }                  from './window-provider';
import { NxUriCacheService }       from '@services/uri-cache.service';
import { Router }                  from '@angular/router';
import { NxSwCacheService }        from '@services/sw-cache.service';

interface IParams<Value = any> {
    [key: string]: Value;
}

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {
    translations: LanguageI18NStaticTypes;
    translateSubject = new BehaviorSubject<LanguageI18NStaticTypes>(null);

    constructor(
        private translate: TranslateService,
        private http: HttpClient,
        private cloudApiService: NxCloudApiService,
        private sessionService: NxSessionService,
        private storageService: LocalStorageService,
        private cacheService: NxUriCacheService,
        private swCacheService: NxSwCacheService,
        private router: Router,
        @Inject(WINDOW) private window: Window
    ) {
        if (environment.isLocal) {
            this.currentLang = this.sessionService.language;
        }
        // TODO: Delete this if no issues *****************
        // setting translations here has no effect (beside unnecessary subscriptions running)
        // as we don't use translation loader and setting translations
        // manually via setTranslations -- TT
        //
        // this.translations = this.translate.translations[this.translate.currentLang];
        // this.translateSubject.next(this.translations);
        // this.translateSubject.subscribe(translations => {
        //     this.translations = translations;
        // });
        // ************************************************
        this.storageService.observe('language').subscribe(_ => {
            // webadmin will handle the reload
            if (!environment.isLocal) {
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

    /**
     * Use to incrementally add params to a string to be translated.
     *
     * The method accepts the string to be translated as a param.
     *
     * Returns an translationObject with addParams and toString methods.
     *
     * The addParams method adds an object with params to be added and returns the translationObject
     * so that it can be chained.
     *
     * The getString method returns the translated string with the params.
     *
     * @param toTranslate - Language string to translate
     */
    static incrementalTranslate(toTranslate) {
        const params = {};
        const translationObject = {
            addParams: (paramsToAdd: IParams) => {
                Object.assign(params, paramsToAdd);
                return translationObject;
            },
            getString: () => toTranslate(params)
        };
        return translationObject;
    }

    static translate(toTranslate: any, translateParams = {}) {
        return toTranslate(translateParams);
    }

    loadLanguage() {
        const lang = this.translate.currentLang ?? this.translate.getDefaultLang();

        return (environment.isLocal
            ? this.http.get(`/static/lang_${lang}/language_compiled.json`)
            : this.cloudApiService.getLanguage()).toPromise();
    }

    setTranslations(lang: string, translation): void {
        this.translate.setTranslation(lang, translation);
        this.translate.use(lang); // this will tell TranslateService to switch language -> see "breadcrumbs"

        this.translations = this.translate.translations[this.translate.currentLang];
        this.translateSubject.next(this.translations);
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
            .catch((err) => console.error(err));
    }
}
