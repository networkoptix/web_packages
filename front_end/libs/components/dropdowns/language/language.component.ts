import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef,
    Directive,
    Inject, Output, EventEmitter
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ILanguage, ILanguages } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService } from '@services/session.service';
import { WINDOW } from '@services/window-provider';
import { paramSortFunc } from '@utils/general';

import { BaseDropdown } from '../injDropdown';

@Directive()
class BaseLanguageDropdown extends BaseDropdown {
    @Input() dropup;
    @Input() short;
    @Input() altStyle;
    @Output() langChange = new EventEmitter<string>();

    currentLang: string;
    show: boolean;
    direction: string;
    langCode: string;
    newHeader = false;
    activeLanguage: ILanguage = {
        language: '',
        name: ''
    };

    languages: ILanguages = [];
    languagesCol1 = [];
    languagesCol2 = [];

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private languageService: NxLanguageProviderService,
        private sessionService: NxSessionService,
        @Inject(WINDOW) private window: Window,
    ) {
        super(configService);

        this.newHeader = this.CONFIG.featureFlags.newHeader;
        this.currentLang = languageService.currentLang;
    }

    private splitLanguages(): void {
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

    setLanguage(): void {
        if (this.activeLanguage?.language !== this.langCode) {
            this.activeLanguage = this.languages.find(lang => {
                return (lang.language === this.langCode);
            });

            if (this.languageService.currentLang !== this.langCode) {
                if (environment.isLocal) {
                    this.sessionService.language = this.langCode;
                    this.window.location.reload();
                } else {
                    this.cloudApi
                        .changeLanguage(this.langCode)
                        .then(() => {
                            this.languageService.currentLang = this.langCode;
                            this.langChange.emit(this.langCode);
                        });
                }
            }
        }
    }

    ngOnInit(): void {
        this.direction = this.dropup ? 'dropup' : '';

        this.cloudApi.getLanguages().then(data => {
            this.languages = this.CONFIG?.supportedLanguages?.length === 0
                ? data
                : data.filter(language =>
                    this.CONFIG.supportedLanguages?.includes(language.language));
            this.languages.sort(paramSortFunc(lang => lang.language));

            this.splitLanguages();

            if (!this.currentLang) {
                this.currentLang = this.sessionService.language ?? this.CONFIG.defaultLanguage;
            }

            this.activeLanguage = this.languages.find(lang => {
                return (lang.language === this.currentLang);
            });
            this.onChangeCallback(this.activeLanguage?.language);
        });
    }

    /**
     * Overwrite
     */
    writeValue(langCode: any): void {
        this.langCode = langCode;
        if (langCode) {
            this.setLanguage();
        }
    }

    onBlur(): void {
        this.onTouchedCallback();
    }
}

@Component({
    selector: 'nx-language-select',
    templateUrl: 'language.component.html',
    styleUrls: [environment.isLocal ? 'language-webadmin.component.scss' : 'language.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxLanguageDropdown),
            multi: true
        }
    ]
})
export class NxLanguageDropdown extends BaseLanguageDropdown {}

@Component({
    selector: 'nx-header-language-select',
    templateUrl: 'language.component.html',
    styleUrls: [environment.isLocal ? 'language-webadmin.component.scss' : 'language.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxLanguageDropdown),
            multi: true
        }
    ]
})
export class NxHeaderLanguageDropdown extends BaseLanguageDropdown {}
