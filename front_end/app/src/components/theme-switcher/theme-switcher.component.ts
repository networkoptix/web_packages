import {
    Component,
    Inject,
    Input,
    OnInit,
} from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-theme-switcher-component',
    styleUrls: ['./theme-switcher.component.scss'],
    templateUrl: './theme-switcher.component.html',
})
export class NxThemeSwitcherComponent implements OnInit {
    @Input() layout = 'extended';

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    theme : string;
    selectedTheme : string;
    darkThemeMq: MediaQueryList;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private localStorageService: LocalStorageService,
        @Inject(WINDOW) protected window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');
        this.selectedTheme = this.localStorageService.retrieve('theme');
        NxConfigService.isDarkTheme = this.selectedTheme === 'dark' ||
            this.selectedTheme === 'auto' && this.darkThemeMq.matches;
    }

    setTheme(name): void {
        this.selectedTheme = name;
        if (name === 'auto') {
            this.localStorageService.store('theme', 'auto');
            this.theme = this.darkThemeMq.matches ? 'dark' : 'light';
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
        } else {
            this.theme = name;
            NxConfigService.isDarkTheme = this.theme === 'dark';
            this.localStorageService.store('theme', this.theme);
        }
        this.window.document.documentElement.setAttribute('data-theme', this.theme);
    }
}
