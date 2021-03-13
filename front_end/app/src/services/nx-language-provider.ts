import { Inject, Injectable }              from '@angular/core';
import { HttpClient }              from '@angular/common/http';
import { TranslateService }        from '@ngx-translate/core';
import { BehaviorSubject }         from 'rxjs';

import { environment }              from '@environments/environment';
import { NxCloudApiService }        from './nx-cloud-api';
import { LanguageI18NStaticTypes }  from '@app/language_i18n_static_types';
import { NxSessionService }         from './session.service';
import { LocalStorageService }      from 'ngx-webstorage';
import { WINDOW }                   from './window-provider';
import { NxUriCacheService } from '@services/uri-cache.service';
import { Router } from '@angular/router';

interface IParams<Value = any> {
    [key: string]: Value;
}

@Injectable({
    providedIn: 'root'
})
export class NxLanguageProviderService {
    translations: LanguageI18NStaticTypes;
    translateSubject = new BehaviorSubject<LanguageI18NStaticTypes>(null);

    constructor(private translate: TranslateService,
        private http: HttpClient,
        private cloudApiService: NxCloudApiService,
        private sessionService: NxSessionService,
        private storageService: LocalStorageService,
        private cacheService: NxUriCacheService,
        private router: Router,
        @Inject(WINDOW) private window: Window
    ) {
        if (environment.isLocal) {
            this.currentLang = this.sessionService.language;
        }
        this.translations = this.translate.translations[this.translate.currentLang];
        this.translateSubject.next(this.translations);
        this.translateSubject.subscribe(translations => {
            this.translations = translations;
        });
        this.storageService.observe('language').subscribe(_ => {
            if (!this.window.document.hasFocus()) {
                this.window.location.reload();
            }
        });
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
        this.translate.currentLang = lang;

        this.translateSubject.next(this.translate.translations[this.translate.currentLang]);
    }

    public get currentLanguage(): string {
        return this.translate.currentLang;
    }

    public get newTranslation() {
        return this.translate.translations;
    }

    public set newTranslation(translate: { language: string, json: JSON }) {
        this.translate.setTranslation(translate.language, translate.json);
        this.translate.currentLang = translate.language;

        this.translateSubject.next(this.translate.translations[this.translate.currentLang]);
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
        this.sessionService.language = language;
        this.loadLanguage().then(translation => {
            this.setTranslations(language, translation);
        });
        this.cacheService.cachedData.clear();
        // Reload current component
        const currentUrl = this.router.url;
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(_ => {
            this.router.navigateByUrl(currentUrl);
        });
    }
}
