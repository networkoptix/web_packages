import {
    Component,
    Input,
    OnInit,
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { images } from '@lib/variables/static-variables';
import { Account } from '@services/account.service/account';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxThemeService } from '@services/theme.service';

@Component({
    selector: 'nx-theme-switcher-component',
    styleUrls: ['./theme-switcher.component.scss'],
    templateUrl: './theme-switcher.component.html',
})
export class NxThemeSwitcherComponent implements OnInit {
    @Input() layout: string = 'extended';
    @Input() account: Account;

    LANG: LanguageI18NStaticTypes;
    images = images;

    selectedTheme: string;

    constructor(
        languageService: NxLanguageProviderService,
        private themeService: NxThemeService,
    ) {
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        this.selectedTheme = this.themeService.getTheme();
    }

    setTheme(name: string | null): void {
        this.themeService.setTheme(name, this.account?.email);
        this.selectedTheme = name;
    }
}
