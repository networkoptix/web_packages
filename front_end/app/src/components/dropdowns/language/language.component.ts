import {
    Component, ViewEncapsulation,
    Input, forwardRef, Directive
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { BaseDropdown }              from '../injDropdown';
import { environment }               from '@environments/environment';
import { NxUtilsService }            from '@services/utils.service';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService }           from '@services/nx-config';
import { ILanguage, ILanguages }     from '@services/nx-cloud-api.types';
import { LocalStorageService }       from 'ngx-webstorage';

@Directive()
class BaseLanguageDropdown extends BaseDropdown {
    @Input() instantReload;
    @Input() instantApply;
    @Input() dropup;
    @Input() short;
    @Input() altStyle;

    currentLang: string;
    show: boolean;
    direction: string;
    langCode: string;
    activeLanguage = {
        language : '',
        name     : ''
    };

    languages: ILanguages = [];
    languagesCol1 = [];
    languagesCol2 = [];

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private languageService: NxLanguageProviderService,
        private localStorageService: LocalStorageService
    ) {
        super(languageService, configService);

        this.currentLang = languageService.currentLanguage;
    }

    private splitLanguages() {
        if (this.languages.length > 12) {
            const halfWayThough = Math.ceil(this.languages.length / 2);

            this.languagesCol1 = this.languages.slice(0, halfWayThough);
            this.languagesCol2 = this.languages.slice(halfWayThough, this.languages.length);
        }
    }

    change(langCode: string) {
        this.langCode = langCode;
        this.onTouchedCallback();
        this.onChangeCallback(langCode);
        this.setLanguage();
        return false; // return false so event will not bubble to HREF
    }

    setLanguage() {
        if (this.activeLanguage.language !== this.langCode) {
            this.activeLanguage = this.languages.find(lang => {
                return (lang.language === this.langCode);
            });

            if (this.instantApply && this.instantReload) {
                /*  TODO: Currently this is not needed because the language file will
                 be loaded during page reload. Once we transfer everything to Angular 5
                 we should use this for seamless change of language
                 // this.translate.use(lang.replace('_', '-'));
                 */
                if (this.CONFIG.isLocal) {
                    this.languageService.currentLang = this.langCode;
                    window.location.reload();
                } else {
                    this.cloudApi
                        .changeLanguage(this.langCode)
                        .then(_ => {
                            this.localStorageService.store('language', this.langCode);
                            this.languageService.currentLang = this.langCode;
                        });
                }
            }
        }
    }

    ngOnInit(): void {
        this.direction = this.dropup ? 'dropup' : '';
        this.instantReload = this.instantReload !== undefined;
        this.instantApply = this.instantApply !== undefined;
        let languagePromise;
        if (this.CONFIG.isLocal) {
            const languages = this.CONFIG.supportedLanguages.map((langCode) => {
                const lang = { name: langCode, language: langCode };
                return <ILanguage>lang;
            });
            languagePromise = Promise.resolve(languages);
        } else {
            languagePromise = this.cloudApi.getLanguages();
        }
        languagePromise.then((data) => {
            this.languages = data;
            this.languages.sort(NxUtilsService.byParam((lang) => {
                return lang.language;
            }, NxUtilsService.sortASC));

            this.splitLanguages();

            this.activeLanguage = this.languages.find(lang => {
                return (lang.language === this.currentLang);
            });
            this.onChangeCallback(this.activeLanguage?.language);
        });
    }

    /**
     * Overwrite
     */
    writeValue(langCode: any) {
        this.langCode = langCode;
        if (langCode) {
            this.setLanguage();
        }
    }

    onBlur() {
        this.onTouchedCallback();
    }
}

@Component({
    selector      : 'nx-language-select',
    templateUrl   : 'language.component.html',
    styleUrls     : ['language.component.scss'],
    encapsulation : ViewEncapsulation.None,
    providers     : [
        {
            provide     : NG_VALUE_ACCESSOR,
            useExisting : forwardRef(() => NxLanguageDropdown),
            multi       : true
        }
    ]
})
export class NxLanguageDropdown extends BaseLanguageDropdown {}

@Component({
    selector      : 'nx-header-language-select',
    templateUrl   : 'language.component.html',
    styleUrls     : [environment.isLocal ? 'language-webadmin.component.scss' : 'language.component.scss'],
    encapsulation : ViewEncapsulation.None,
    providers     : [
        {
            provide     : NG_VALUE_ACCESSOR,
            useExisting : forwardRef(() => NxLanguageDropdown),
            multi       : true
        }
    ]
})
export class NxHeaderLanguageDropdown extends BaseLanguageDropdown {}
