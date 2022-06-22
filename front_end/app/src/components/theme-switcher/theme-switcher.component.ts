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
        this.theme = this.localStorageService.retrieve('theme');
        NxConfigService.isDarkTheme = this.theme === 'dark';
    }

    setTheme(name): void {
        this.theme = name;
        if (name === 'auto') {
            const darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');
            name = darkThemeMq.matches ? 'dark' : 'light';
        }
        NxConfigService.isDarkTheme = name === 'dark';
        this.localStorageService.store('theme', name);
        this.window.document.documentElement.setAttribute('data-theme', name);
    }
}
