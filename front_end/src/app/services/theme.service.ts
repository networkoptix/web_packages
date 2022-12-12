import { Inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { WINDOW } from '@services/window-provider';

import { NxConfigService } from './nx-config/nx-config.service';

@Injectable({
    providedIn: 'root'
})
export class NxThemeService {
    CONFIG: IConfig;
    darkThemeMq: MediaQueryList;
    themeSelected: string;
    userTheme: string;

    public availThemes = {
        auto: 'auto',
        light: 'light',
        dark: 'dark',
    };

    constructor(
        configService: NxConfigService,
        private localStorageService: LocalStorageService,
        private cloudApi: NxCloudApiService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
    }

    async initTheme(): Promise<void> {
        if (this.CONFIG.themeConfig) {
            // set availThemes //
            Object.assign(this.availThemes, {
                light: this.CONFIG.themeConfig.light,
                dark: this.CONFIG.themeConfig.dark,
            });
        }

        const loginState = this.localStorageService.retrieve('loginstate');
        this.themeSelected = this.localStorageService.retrieve('theme');
        NxConfigService.isDarkTheme = this.themeSelected === this.availThemes.dark;

        this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');

        this.darkThemeMq.addEventListener('change', e => {
            this.themeSelected = this.localStorageService.retrieve('theme');
            if (this.themeSelected !== 'auto') {
                return;
            }
            NxConfigService.isDarkTheme = e.matches;
            if (e.matches) {
                this.window.document.documentElement.setAttribute('data-theme', this.availThemes.dark);
            } else {
                this.window.document.documentElement.setAttribute('data-theme', this.availThemes.light);
            }
        });

        if (loginState) {
            await this.cloudApi.getCustomAccountProperty('theme', loginState)
                .toPromise()
                .then(result => {
                    this.userTheme = this.getThemeRealName(result.theme);
                    this.themeSelected = this.getThemeRealName(result.theme);
                }, err => {
                    console.error('Feature not available', err);
                });
        } else {
            this.themeSelected = this.CONFIG.themeConfig.default;
        }

        this.setTheme(this.themeSelected, loginState);
    }

    getTheme(): string {
        return this.themeSelected;
    }

    getThemeRealName(name: string): string {
        // theme name should have pattern "dark-*" etc
        const targetTheme = name.split('-')[0];
        return this.availThemes[targetTheme];
    }

    setTheme(themeSelected: string, username:string): void {
        const docTheme = this.window.document.documentElement.getAttribute('data-theme');

        if (
            themeSelected === 'auto' ||
            !themeSelected &&
            !username
        ) {
            this.localStorageService.store('theme', 'auto');
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
            this.window.document.documentElement.setAttribute(
                'data-theme',
                NxConfigService.isDarkTheme ? this.availThemes.dark : this.availThemes.light
            );
        } else {
            if (
                docTheme === this.userTheme &&
                docTheme === themeSelected
            ) {
                return; // avoid reloading if same theme is set
            }
            this.localStorageService.store('theme', themeSelected);
            NxConfigService.isDarkTheme = themeSelected === this.availThemes.dark;
            this.window.document.documentElement.setAttribute(
                'data-theme',
                themeSelected
            );
        }

        username &&
        this.userTheme !== themeSelected &&
        this.cloudApi.saveCustomAccountProperty(
            { theme: themeSelected },
            'theme',
            username
        ).toPromise()
            .then(result => {
                this.themeSelected = this.getThemeRealName(result.theme);
            }, err => {
                console.warn('Cannot save theme: ', err);
            });
    }
}
