import { Inject, Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { CustomAccountProperty } from './nx-cloud-api/custom-account-property';

enum AvailableThemes {
    auto = 'auto',
    light = 'light',
    dark = 'dark'
}

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxThemeService {
    CONFIG: IConfig;
    darkThemeMq: MediaQueryList;
    themeSelected: string;
    userTheme: string;

    themeCustomProperty: CustomAccountProperty<{ theme: AvailableThemes }>;

    public availThemes = AvailableThemes;

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private sessionStorage: SessionStorageService,
        private localStorageService: LocalStorageService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.themeCustomProperty = this.cloudApi.customAccountPropertyFactory('theme', { theme: this.CONFIG.themeConfig.default as AvailableThemes });

        this.sessionStorage.observe('theme')
            .pipe(untilDestroyed(this))
            .subscribe(theme => {
                if (!this.window.document.hasFocus()) {
                    this.window.document.documentElement.setAttribute(
                        'data-theme',
                        theme
                    );
                }
            });
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
        this.themeSelected = this.sessionStorage.retrieve('theme');
        NxConfigService.isDarkTheme = this.themeSelected === this.availThemes.dark;

        this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');

        if (!this.CONFIG.featureFlags.themesEnabled) {
            this.themeSelected = this.availThemes.light;
            await this.setTheme(this.themeSelected, loginState);
            return;
        }

        this.darkThemeMq.addEventListener('change', e => {
            this.themeSelected = this.sessionStorage.retrieve('theme');
            if (this.themeSelected !== 'auto') {
                return;
            }
            NxConfigService.isDarkTheme = e.matches;
            const theme = NxConfigService.isDarkTheme ? this.availThemes.dark : this.availThemes.light;
            this.window.document.documentElement.setAttribute('data-theme', theme);
        });

        if (loginState) {
            await this.themeCustomProperty.get(false, true)
                .then(result => {
                    this.userTheme = this.getThemeRealName(result.theme || this.CONFIG.themeConfig.default);
                    this.themeSelected = this.getThemeRealName(result.theme || this.CONFIG.themeConfig.default);
                }, err => {
                    console.error('Feature not available', err);
                });
        } else {
            this.themeSelected = this.CONFIG.themeConfig.default === 'auto'
                ? this.CONFIG.themeConfig.default
                : this.getThemeRealName(this.CONFIG.themeConfig.default);
        }

        await this.setTheme(this.themeSelected, loginState);
    }

    getTheme(): string {
        return this.themeSelected;
    }

    getThemeRealName(name: string): string {
        // theme name should have pattern "dark-*" etc
        const targetTheme = name.split('-')[0];
        return this.availThemes[targetTheme];
    }

    async setTheme(themeSelected: string, username: string): Promise<void> {
        const docTheme = this.window.document.documentElement.getAttribute('data-theme');
        let { themesEnabled } = this.CONFIG.featureFlags;
        if (username === 'setup') {
            themesEnabled = true;
        }

        themeSelected = themesEnabled ? themeSelected || 'auto' : this.availThemes.light;
        if (
            themeSelected === 'auto' ||
            !themeSelected &&
            !username
        ) {
            this.sessionStorage.store('theme', themeSelected);
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
            const theme = NxConfigService.isDarkTheme && themesEnabled ? 'dark' : 'light';
            this.window.document.documentElement.setAttribute(
                'data-theme',
                theme
            );
        } else {
            if (
                docTheme === this.userTheme &&
                docTheme === themeSelected &&
                docTheme === this.sessionStorage.retrieve('theme')
            ) {
                return; // avoid reloading if same theme is set
            }
            this.sessionStorage.store('theme', themeSelected);
            NxConfigService.isDarkTheme = themeSelected === this.availThemes.dark;
            this.window.document.documentElement.setAttribute(
                'data-theme',
                themeSelected
            );
        }

        username &&
        username !== 'setup' &&
        this.userTheme !== themeSelected &&
        await this.themeCustomProperty.save(
            { theme: themeSelected as AvailableThemes },
            true
        ).then(result => {
            this.themeSelected = this.getThemeRealName(result.theme);
        }, err => {
            console.warn('Cannot save theme: ', err);
        });
    }
}
