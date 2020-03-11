import {
    Component, ViewEncapsulation,
    Input, forwardRef
}                                    from '@angular/core';
import { NxUtilsService }            from '../../../services/utils.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxCloudApiService }         from '../../../services/nx-cloud-api';
import { NG_VALUE_ACCESSOR }         from '@angular/forms';
import { NxConfigService }           from '../../../services/nx-config';
import { BaseDropdown }              from '../injDropdown';

@Component({
    selector     : 'nx-language-select',
    templateUrl  : 'language.component.html',
    styleUrls    : ['language.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers    : [
        {
            provide    : NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxLanguageDropdown),
            multi      : true
        }
    ]
})

export class NxLanguageDropdown extends BaseDropdown {
    @Input() instantReload: any;
    @Input() instantApply: any;
    @Input() dropup: any;
    @Input() short: any;
    @Input() altStyle: any;

    currentLang: string;
    show: boolean;
    direction: string;
    langCode: string;
    activeLanguage = {
        language: '',
        name    : ''
    };

    languages = [];
    languagesCol1 = [];
    languagesCol2 = [];

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private cloudApi: NxCloudApiService
    ) {
        super(languageService, configService);

        this.currentLang = languageService.getLang();
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
                this.cloudApi
                    .changeLanguage(this.langCode)
                    .then((response) => {
                        window.location.reload();
                    });
            }
        }
    }

    ngOnInit(): void {
        this.direction = this.dropup ? 'dropup' : '';
        this.instantReload = this.instantReload !== undefined;
        this.instantApply = this.instantApply !== undefined;

        this.cloudApi
            .getLanguages()
            .then((data: any) => {
                this.languages = data;
                this.languages.sort(NxUtilsService.byParam((lang) => {
                    return lang.language;
                }, NxUtilsService.sortASC));

                this.splitLanguages();

                this.activeLanguage = this.languages.find(lang => {
                    return (lang.language === this.currentLang);
                });
                this.onChangeCallback(this.activeLanguage.language);
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
