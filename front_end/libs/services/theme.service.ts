import { Inject, Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService } from 'ngx-webstorage';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxThemeService {
    CONFIG: IConfig;
    darkThemeMq: MediaQueryList;
    themeSelected: string;
    userTheme: string;

    constructor(
        configService: NxConfigService,
        private localStorageService: LocalStorageService,
        private cloudApi: NxCloudApiService,
        private cookieService: CookieService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();

        this.localStorageService.observe('theme')
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
        const loginState = this.localStorageService.retrieve('loginstate');
        this.themeSelected = this.localStorageService.retrieve('theme');

        this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');

        if (!this.CONFIG.featureFlags.themesEnabled) {
            this.themeSelected = 'light';
            await this.setTheme(this.themeSelected, loginState);
            return;
        }

        this.darkThemeMq.addEventListener('change', e => {
            this.themeSelected = this.localStorageService.retrieve('theme');
            if (this.themeSelected !== 'auto') {
                return;
            }
            NxConfigService.isDarkTheme = e.matches;
            const theme = NxConfigService.isDarkTheme ? 'dark' : 'light';
            this.window.document.documentElement.setAttribute('data-theme', theme);
            this.cookieService.set('theme', theme);
        });

        if (loginState) {
            await this.cloudApi.getCustomAccountProperty('theme', loginState)
                .toPromise()
                .then(result => {
                    this.userTheme = result.name;
                    this.themeSelected = result.theme;
                }, err => {
                    console.error('Feature not available', err);
                });
        } else {
            this.themeSelected = 'dark';
        }

        await this.setTheme(this.themeSelected, loginState);
    }

    getTheme(): string {
        return this.themeSelected;
    }

    async setTheme(themeSelected: string, username: string): Promise<void> {
        const docTheme = this.window.document.documentElement.getAttribute('data-theme');
        let { themesEnabled } = this.CONFIG.featureFlags;
        if (username === 'setup') {
            themesEnabled = true;
        }

        themeSelected = themesEnabled ? themeSelected || 'auto' : 'light';
        if (
            themeSelected === 'auto' ||
            !themeSelected ||
            !username
        ) {
            this.localStorageService.store('theme', themeSelected);
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
            const theme = NxConfigService.isDarkTheme && themesEnabled ? 'dark' : 'light';
            this.window.document.documentElement.setAttribute(
                'data-theme',
                theme
            );
            this.cookieService.set('theme', theme);
        } else {
            if (docTheme === this.userTheme) {
                return; // avoid reloading if same theme is set
            }
            this.localStorageService.store('theme', themeSelected);
            NxConfigService.isDarkTheme = themeSelected === 'dark';
            this.window.document.documentElement.setAttribute(
                'data-theme',
                themeSelected
            );
            this.cookieService.set('theme', themeSelected);
        }

        username &&
            username !== 'setup' &&
            this.userTheme !== themeSelected &&
            await this.cloudApi.saveCustomAccountProperty(
                { theme: themeSelected },
                'theme',
                username
            ).toPromise()
                .then(result => {
                    this.themeSelected = result.theme;
                }, err => {
                    console.warn('Cannot save theme: ', err);
                });
    }
}
