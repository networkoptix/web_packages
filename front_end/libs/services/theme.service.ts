import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService, SessionStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { CustomAccountProperty } from './nx-cloud-api/custom-account-property';
import { nxConfig } from './nx-config/config';
enum AvailableThemes {
    auto = 'auto',
    light = 'light',
    dark = 'dark',
    hsl = 'hsl',
}

@Injectable({
    providedIn: 'root',
})
export class NxThemeService {
    CONFIG = nxConfig;
    darkThemeMq: MediaQueryList;
    themeSelected: string;
    userTheme: string;
    viewType: string;

    themeCustomProperty: CustomAccountProperty<{ theme: AvailableThemes }>;

    public availThemes = AvailableThemes;

    constructor(
        private cloudApi: NxCloudApiService,
        private localStorageService: LocalStorageService,
        private sessionStorage: SessionStorageService,
        private cookieService: CookieService,
        private router: Router,
        private store: Store,
        @Inject(WINDOW) private window: Window,
        @Inject(DOCUMENT) protected document: Document,
    ) {
        this.router.events
            .pipe(
                filter(e => e instanceof ActivationEnd),
                take(1),
            )
            .subscribe(({ snapshot: { queryParams } }: ActivationEnd) => {
                this.viewType =
                    queryParams?.view_type ||
                    this.window.document.documentElement.getAttribute('data-platform') ||
                    'web';
            });

        if (!nxConfig.featureFlags.themesEnabled) {
            return;
        }
        this.themeCustomProperty = this.cloudApi.customAccountPropertyFactory('theme', {
            theme: this.CONFIG.themeConfig.default as AvailableThemes,
        });

        if (this.CONFIG.themeConfig) {
            // set availThemes //
            Object.assign(this.availThemes, {
                light: this.CONFIG.themeConfig.light,
                dark: this.CONFIG.themeConfig.dark,
            });
        }

        this.sessionStorage
            .observe('theme')
            .pipe(takeUntilDestroyed())
            .subscribe(theme => {
                if (!this.window.document.hasFocus()) {
                    this.window.document.documentElement.setAttribute(
                        'data-theme',
                        this.getThemeRealName(theme),
                    );
                }
            });

        this.store
            .select(accountSelectors.selectCurrentUserName)
            .pipe(takeUntilDestroyed())
            .subscribe(async (email: string) => {
                if (this.viewType !== 'web') {
                    this.themeSelected = this.CONFIG.themeConfig.dark;
                } else if (email && nxConfig.featureFlags.themesEnabled) {
                    await this.themeCustomProperty.get(false, true).then(
                        result => {
                            this.themeSelected = result.theme || this.CONFIG.themeConfig.default;
                        },
                        err => {
                            console.error('Feature not available', err);
                        },
                    );
                } else {
                    this.themeSelected =
                        this.CONFIG.themeConfig.default === 'auto'
                            ? this.CONFIG.themeConfig.default
                            : this.getThemeRealName(this.CONFIG.themeConfig.default);
                }

                await this.setTheme(this.themeSelected, email);
            });

        this.scope = this.document.documentElement;
        this.themeMode$.pipe(takeUntilDestroyed()).subscribe((mode: number) => {
            if (mode) {
                // 0 - dark, 1 - light
                this.setColorsFor('background', {
                    'background-h': 200,
                    'background-s': 20,
                    'background-l': 94,
                });
            } else {
                this.setColorsFor('background', {
                    'background-h': 200,
                    'background-s': 20,
                    'background-l': 6,
                });
            }
        });
    }

    private setCookie(theme: string): void {
        if (nxConfig.featureFlags.themesEnabled) {
            this.cookieService.set('theme', theme);
        }
    }

    async initTheme(): Promise<void> {
        // Don't initialize theme as desktop and mobile use ONLY dark mode
        if (this.viewType !== 'web') {
            return;
        }

        if (!nxConfig.featureFlags.themesEnabled) {
            this.themeSelected = 'light';
            await this.setTheme(this.themeSelected, undefined);
            return;
        }
        this.themeSelected = this.sessionStorage.retrieve('theme');

        this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');

        if (this.themeSelected === 'auto') {
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
        } else {
            NxConfigService.isDarkTheme = !!this.themeSelected?.startsWith('dark');
        }

        this.darkThemeMq.addEventListener('change', e => {
            this.themeSelected = this.sessionStorage.retrieve('theme');
            if (this.themeSelected !== 'auto') {
                return;
            }
            NxConfigService.isDarkTheme = e.matches;
            // NxConfigService.isDarkTheme && this.initHslTheme();

            const theme = NxConfigService.isDarkTheme ? 'dark' : 'light';

            this.window.document.documentElement.setAttribute(
                'data-theme',
                this.getThemeRealName(theme),
            );
            this.setCookie(theme);
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
        let { themesEnabled } = nxConfig.featureFlags;
        if (username === 'setup' || this.viewType !== 'web') {
            themesEnabled = true;
        }
        themeSelected = themesEnabled ? themeSelected || 'auto' : 'light';
        if (themeSelected === 'auto' || (!themeSelected && !username)) {
            this.sessionStorage.store('theme', themeSelected);
            this.themeSelected = themeSelected;
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
            const theme =
                NxConfigService.isDarkTheme && themesEnabled
                    ? this.getThemeRealName('dark')
                    : this.getThemeRealName('light');
            this.window.document.documentElement.setAttribute('data-theme', theme);
            this.setCookie(theme);
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
                this.getThemeRealName(themeSelected),
            );
            this.setCookie(themeSelected);
            this.themeSelected = themeSelected;
        }

        if (!nxConfig.featureFlags.themesEnabled) {
            return;
        }

        if (this.themeSelected === 'hsl') {
            this.setHSLTheme(true);
        }

        if (username && username !== 'setup' && this.viewType === 'web') {
            await this.themeCustomProperty
                .update(curr => {
                    curr.theme = this.themeSelected as AvailableThemes;
                    return curr;
                }, true)
                .catch(err => {
                    console.warn('Cannot save theme: ', err);
                });
        }
    }

    // *********************************************************************
    async setHSLTheme(setHSL: boolean): Promise<void> {
        const theme = setHSL ? 'hsl' : 'dark';
        this.sessionStorage.store('theme', theme);
        this.setCookie(theme);
        this.themeSelected = theme;

        this.window.document.documentElement.setAttribute('data-theme', theme);

        await this.themeCustomProperty
            .update(curr => {
                curr.theme = this.themeSelected as AvailableThemes;
                return curr;
            }, true)
            .catch(err => {
                console.warn('Cannot save theme: ', err);
            });

        if (setHSL) {
            this.initHslTheme();
        }
    }

    isHSLTheme(): boolean {
        return this.sessionStorage.retrieve('theme') === 'hsl';
    }

    static hexToHSL(hex: string): Record<string, number> {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        let r = parseInt(result[1], 16);
        let g = parseInt(result[2], 16);
        let b = parseInt(result[3], 16);
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h: number;
        let s: number;
        const l = (max + min) / 2;
        if (max === min) {
            h = 0;
            s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return {
            hue: Math.round(h * 360),
            sat: Math.round(s * 100),
            lum: Math.round(l * 100),
        };
    }

    static hslToHex(hsl: { h: number; s: number; l: number }): string {
        const { h, s, l } = hsl;

        const hDecimal = l / 100;
        const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
        const f = (n: number): string => {
            const k = (n + h / 30) % 12;
            const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);

            // Convert to Hex and prefix with "0" if required
            return Math.round(255 * color)
                .toString(16)
                .padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    static toHSLObject = (hslStr: string): { s: number; h: number; l: number } => {
        if (!hslStr.length) {
            return;
        }
        const hs = hslStr.substring(0, hslStr.indexOf('calc'));
        const match = hslStr.replace(/\s/g, '').match(/[\d%\s-+*.]+/g);
        // match = [hue, sat, lum /* w/o calc */, alpha /* optional */]
        // eslint-disable-next-line no-eval
        const l = eval(match[2].replace(/%/g, ''));
        const [h, s] = hs.match(/\d+/g).map(Number);
        return { h, s, l };
    };

    colorLuminosity = {
        l4: 1.6,
        l3: 1.5,
        l2: 1.3,
        l1: 1.1,
        core: 1,
        d1: 0.9,
        d2: 0.7,
        d3: 0.5,
        d4: 0.3,
        d5: 0.2,
    };
    brand = {
        hue: 0,
        saturation: 0,
        luminosity: 0,
    };
    color = {
        hue: 0,
        saturation: 0,
        luminosity: 0, // set to step +5%
    };
    background = {
        hue: 0,
        saturation: 0,
        luminosity: 0,
    };
    luminosityStep: Record<string, string>[] | number;
    themeMode$ = new BehaviorSubject<Record<string, string>[] | number>(0); // 0 - dark, 1-light
    isWidgetShown$ = new BehaviorSubject<boolean>(false);
    scope: HTMLElement;
    rs: CSSStyleDeclaration;

    setBrandHue(value: number): void {
        this.brand.hue = +value;
        this.scope.style.setProperty('--brand-h', `${this.brand.hue}`);
    }

    setBrandSaturation(value: number): void {
        this.brand.saturation = +value;
        this.scope.style.setProperty('--brand-s', `${this.brand.saturation}%`);
    }

    setBrandLuminosity(value: number): void {
        this.brand.luminosity = +value;
        this.scope.style.setProperty('--brand-l', `${this.brand.luminosity}%`);
    }

    setLeverLuminosity(item: Record<string, string>): void {
        this.colorLuminosity[item.label] = parseFloat(item.value);
        this.scope.style.setProperty(
            `--color-level-${item.label}`,
            this.colorLuminosity[item.label],
        );
    }

    setColorHue(value: number): void {
        this.color.hue = value;
        this.scope.style.setProperty('--color-h', `${this.color.hue}`);
    }

    setColorSaturation(value: number): void {
        this.color.saturation = value;
        this.scope.style.setProperty('--color-s', `${this.color.saturation}%`);
    }

    setColorLuminosityStep(value: number): void {
        this.luminosityStep = value;
        this.scope.style.setProperty('--color-l-step', `${this.luminosityStep}%`);
    }

    setColorsFor(
        color: string,
        themeSelected: Record<string, Record<string, string>[] | number>,
    ): void {
        this[color].hue = themeSelected[`${color}-h`];
        this[color].saturation = themeSelected[`${color}-s`];
        this[color].luminosity = themeSelected[`${color}-l`];
        this.scope.style.setProperty(`--${color}-h`, `${this[color].hue}`);
        this.scope.style.setProperty(`--${color}-s`, `${this[color].saturation}%`);
        this.scope.style.setProperty(`--${color}-l`, `${this[color].luminosity}%`);
    }

    setColorLuminosity(themeSelected: Record<string, Record<string, string>[] | number>): void {
        for (const key in this.colorLuminosity) {
            this.colorLuminosity[key] = themeSelected[`color-level-${key}`];
            this.scope.style.setProperty(`--color-level-${key}`, this.colorLuminosity[key]);
        }
    }

    initHslTheme(): void {
        const themeSelected = this.localStorageService.retrieve('theme-hsl');

        if (Object.keys(themeSelected).length === 21) {
            // on initial load some properties may not be initialized
            this.setColorsFor('brand', themeSelected);
            this.setColorsFor('color', themeSelected);
            this.setColorsFor('background', themeSelected);

            this.setColorLuminosity(themeSelected);

            this.luminosityStep = themeSelected['color-l-step'];
            this.scope.style.setProperty('color-l-step', `${this.luminosityStep}%`);

            this.themeMode$.next(themeSelected['theme-mode']);
            this.scope.setAttribute('data-theme-mode', this.themeMode$.value ? 'light' : 'dark');

            this.rs = getComputedStyle(this.scope);
        } else {
            this.rs = getComputedStyle(this.scope);

            this.colorLuminosity.l4 = parseFloat(this.rs.getPropertyValue('--color-level-l4'));
            this.colorLuminosity.l3 = parseFloat(this.rs.getPropertyValue('--color-level-l3'));
            this.colorLuminosity.l2 = parseFloat(this.rs.getPropertyValue('--color-level-l2'));
            this.colorLuminosity.l1 = parseFloat(this.rs.getPropertyValue('--color-level-l1'));
            this.colorLuminosity.core = parseFloat(this.rs.getPropertyValue('--color-level-core'));
            this.colorLuminosity.d1 = parseFloat(this.rs.getPropertyValue('--color-level-d1'));
            this.colorLuminosity.d2 = parseFloat(this.rs.getPropertyValue('--color-level-d2'));
            this.colorLuminosity.d3 = parseFloat(this.rs.getPropertyValue('--color-level-d3'));
            this.colorLuminosity.d4 = parseFloat(this.rs.getPropertyValue('--color-level-d4'));
            this.colorLuminosity.d5 = parseFloat(this.rs.getPropertyValue('--color-level-d5'));

            this.background.hue = parseInt(this.rs.getPropertyValue('--background-h'));
            this.background.saturation = parseInt(this.rs.getPropertyValue('--background-s'));
            this.background.luminosity = parseInt(this.rs.getPropertyValue('--background-l'));

            this.brand.hue = parseInt(this.rs.getPropertyValue('--brand-h'));
            this.brand.saturation = parseInt(this.rs.getPropertyValue('--brand-s'));
            this.brand.luminosity = parseInt(this.rs.getPropertyValue('--brand-l'));

            this.color.hue = parseInt(this.rs.getPropertyValue('--color-h'));
            this.color.saturation = parseInt(this.rs.getPropertyValue('--color-s'));
            this.color.luminosity = parseFloat(this.rs.getPropertyValue('--color-l'));

            this.luminosityStep = parseFloat(this.rs.getPropertyValue('--color-l-step'));
        }
    }
}
