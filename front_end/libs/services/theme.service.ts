import { Inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { SessionStorageService } from 'ngx-webstorage';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSessionService } from '@services/session.service';
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
    viewType: 'web' | 'desktop' | 'mobile';

    themeCustomProperty: CustomAccountProperty<{ theme: AvailableThemes }>;

    public availThemes = AvailableThemes;

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private sessionStorage: SessionStorageService,
        private sessionService: NxSessionService,
        private cookieService: CookieService,
        private route: ActivatedRoute,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.themeCustomProperty = this.cloudApi.customAccountPropertyFactory('theme', { theme: this.CONFIG.themeConfig.default as AvailableThemes });
        this.viewType = this.route.snapshot.queryParams.view_type || 'web';

        this.sessionStorage.observe('theme')
            .pipe(untilDestroyed(this))
            .subscribe(theme => {
                if (!this.window.document.hasFocus()) {
                    this.window.document.documentElement.setAttribute(
                        'data-theme',
                        this.getThemeRealName(theme)
                    );
                }
            });

        this.sessionService.loginStateSubject
            .pipe(untilDestroyed(this))
            .subscribe(async (loginState: string) => {
                if (this.viewType !== 'web') {
                    this.themeSelected = this.CONFIG.themeConfig.dark;
                } else if (loginState) {
                    await this.themeCustomProperty.get(false, true)
                        .then(result => {
                            this.themeSelected = result.theme || this.CONFIG.themeConfig.default;
                        }, err => {
                            console.error('Feature not available', err);
                        });
                } else {
                    this.themeSelected = this.CONFIG.themeConfig.default === 'auto'
                        ? this.CONFIG.themeConfig.default
                        : this.getThemeRealName(this.CONFIG.themeConfig.default);
                }

                await this.setTheme(this.themeSelected, loginState);
            });
    }

    async initTheme(): Promise<void> {
        // Don't initialize theme as desktop and mobile use ONLY dark mode
        if (this.viewType !== 'web') {
            return;
        }
        if (this.CONFIG.themeConfig) {
            // set availThemes //
            Object.assign(this.availThemes, {
                light: this.CONFIG.themeConfig.light,
                dark: this.CONFIG.themeConfig.dark,
            });
        }

        if (!this.CONFIG.featureFlags.themesEnabled) {
            this.themeSelected = 'light';
            await this.setTheme(this.themeSelected, undefined);
            return;
        }

        this.themeSelected = this.sessionStorage.retrieve('theme');
        NxConfigService.isDarkTheme = this.themeSelected === 'dark';

        this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');

        this.darkThemeMq.addEventListener('change', e => {
            this.themeSelected = this.sessionStorage.retrieve('theme');
            if (this.themeSelected !== 'auto') {
                return;
            }
            NxConfigService.isDarkTheme = e.matches;
            const theme = NxConfigService.isDarkTheme ? 'dark' : 'light';

            this.window.document.documentElement.setAttribute(
                'data-theme',
                this.getThemeRealName(theme)
            );
            this.cookieService.set('theme', theme);
        });
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
        if (!this.darkThemeMq) {
            this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');
        }
        const docTheme = this.window.document.documentElement.getAttribute('data-theme');
        let { themesEnabled } = this.CONFIG.featureFlags;
        if (
            username === 'setup' ||
            this.viewType !== 'web'
        ) {
            themesEnabled = true;
        }

        themeSelected = themesEnabled ? themeSelected || 'auto' : 'light';
        if (
            themeSelected === 'auto' ||
            !themeSelected &&
            !username
        ) {
            this.sessionStorage.store('theme', themeSelected);
            this.themeSelected = themeSelected;
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
            const theme = NxConfigService.isDarkTheme && themesEnabled ? this.getThemeRealName('dark') : this.getThemeRealName('light');
            this.window.document.documentElement.setAttribute('data-theme', theme);
            this.cookieService.set('theme', themeSelected);
        } else {
            if (
                docTheme === this.userTheme &&
                docTheme === themeSelected &&
                docTheme === this.sessionStorage.retrieve('theme')
            ) {
                return; // avoid reloading if same theme is set
            }
            this.sessionStorage.store('theme', themeSelected);
            NxConfigService.isDarkTheme = themeSelected === 'dark';
            this.window.document.documentElement.setAttribute(
                'data-theme',
                this.getThemeRealName(themeSelected)
            );
            this.cookieService.set('theme', themeSelected);
            this.themeSelected = themeSelected;
        }

        username &&
        username !== 'setup' &&
        this.viewType === 'web' &&
        await this.themeCustomProperty.update(
            curr => {
                curr.theme = this.themeSelected as AvailableThemes;
                return curr;
            },
            true
        ).catch(err => {
            console.warn('Cannot save theme: ', err);
        });
    }
}
