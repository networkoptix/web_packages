import {
    Component,
    Input,
    OnInit,
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { Account } from '@services/account.service/account';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
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

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    selectedTheme : string;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private themeService: NxThemeService,
    ) {
        this.CONFIG = configService.getConfig();
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
