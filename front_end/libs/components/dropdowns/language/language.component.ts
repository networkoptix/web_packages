import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef,
    Directive,
    Output,
    EventEmitter,
    booleanAttribute,
    signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { LocalStorageService } from 'ngx-webstorage';
import { take } from 'rxjs';

import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ILanguage, ILanguages } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { icons, images } from '@static-variables';
import { alphabeticalSort } from '@utils/general';

import { BaseDropdown } from '../injDropdown';

@Directive()
class BaseLanguageDropdown extends BaseDropdown {
    @Input() dropup;
    @Input() short;
    @Input() altStyle;
    @Input({ transform: booleanAttribute }) inHeader: boolean = false;
    @Input({ transform: booleanAttribute }) inFooter: boolean = false;
    @Output() langChange = new EventEmitter<string>();

    currentLang: string;
    direction: string;
    langCode: string;
    activeLanguage: ILanguage = {
        language: '',
        name: '',
    };
    icons = icons;
    images = images;

    languages: ILanguages = [];
    langColumns = [];

    isLoading$$ = signal(false);

    constructor(
        private cloudApi: NxCloudApiService,
        private languageService: NxLanguageProviderService,
        private localStorageService: LocalStorageService,
    ) {
        super();
        this.currentLang = languageService.currentLang;
    }

    private splitLanguages(): void {
        if (this.languages.length > 12) {
            if (this.inHeader || this.inFooter) {
                const midpoint = Math.ceil(this.languages.length / 2);
                this.langColumns.push(this.languages.slice(0, midpoint));
                this.langColumns.push(this.languages.slice(midpoint, this.languages.length));
            } else {
                const languagesCopy = [...this.languages];
                const colLength = Math.ceil(this.languages.length / 3);
                for (let i = 0; i < 3; i++) {
                    const column = languagesCopy.slice(i * colLength, (i + 1) * colLength);
                    this.langColumns.push(column);
                }
            }
        }
    }

    change(langCode: string) {
        this.isLoading$$.set(true);
        this.langCode = langCode;
        this.onTouchedCallback();
        this.onChangeCallback(langCode);
        this.setLanguage();
        this.languageService.translate.onTranslationChange.pipe(take(1)).subscribe(() => {
            this.isLoading$$.set(false);
        });
        return false; // return false so event will not bubble to HREF
    }

    setLanguage(): void {
        if (this.activeLanguage?.language !== this.langCode) {
            this.activeLanguage = this.languages.find(lang => {
                return lang.language === this.langCode;
            });

            if (this.languageService.currentLang !== this.langCode) {
                if (environment.isLocal) {
                    this.localStorageService.store('language', this.langCode);
                    window.location.reload();
                } else {
                    this.cloudApi.changeLanguage(this.langCode).then(() => {
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
            this.languages =
                this.CONFIG?.supportedLanguages?.length === 0
                    ? data
                    : data.filter(language =>
                          this.CONFIG.supportedLanguages?.includes(language.language),
                      );
            this.languages.sort(alphabeticalSort(lang => lang.language));

            this.splitLanguages();

            this.activeLanguage = this.languages.find(lang => {
                return lang.language === this.currentLang;
            });
            this.onChangeCallback(this.activeLanguage?.language);
        });
    }

    override writeValue(langCode: any): void {
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
    styleUrls: [
        environment.isLocal ? 'language-webadmin.component.scss' : 'language.component.scss',
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxLanguageDropdown),
            multi: true,
        },
    ],
})
export class NxLanguageDropdown extends BaseLanguageDropdown {}

@Component({
    selector: 'nx-header-language-select',
    templateUrl: 'language.component.html',
    styleUrls: [
        environment.isLocal ? 'language-webadmin.component.scss' : 'language.component.scss',
    ],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxLanguageDropdown),
            multi: true,
        },
    ],
})
export class NxHeaderLanguageDropdown extends BaseLanguageDropdown {}
