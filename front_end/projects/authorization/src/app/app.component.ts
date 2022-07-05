import { Component, Inject } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    constructor(
        private configService: NxConfigService,
        private localStorageService: LocalStorageService,
        @Inject(WINDOW) private window: Window,
    ) {
        if (this.configService.getConfig().featureFlags.themesEnabled) {
            let themeSelected = this.localStorageService.retrieve('theme');
            const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');

            darkThemeMq.addEventListener('change', e => {
                themeSelected = this.localStorageService.retrieve('theme');
                if (themeSelected !== 'auto') {
                    return;
                }
                NxConfigService.isDarkTheme = e.matches;
                if (e.matches) {
                    this.window.document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    this.window.document.documentElement.setAttribute('data-theme', 'light');
                }
            });

            if (
                themeSelected === 'auto' ||
                themeSelected === null
            ) {
                !themeSelected && this.localStorageService.store('theme', 'auto');
                if (darkThemeMq.matches) {
                    NxConfigService.isDarkTheme = true;
                    this.window.document.documentElement.setAttribute('data-theme', 'dark');
                }
            } else {
                const theme = this.localStorageService.retrieve('theme');
                NxConfigService.isDarkTheme = theme === 'dark';
                this.window.document.documentElement.setAttribute(
                    'data-theme',
                    theme
                );
            }
        }
    }
}
