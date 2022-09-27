import { Inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { WINDOW } from '@services/window-provider';

import { NxConfigService } from './nx-config/nx-config.service';

@Injectable({
    providedIn: 'root'
})
export class NxThemeService {
    darkThemeMq: MediaQueryList;
    themeSelected: string;
    userTheme: string;

    constructor(
        private localStorageService: LocalStorageService,
        private cloudApi: NxCloudApiService,
        @Inject(WINDOW) private window: Window,
    ) {
    }

    async initTheme(): Promise<void> {
        const loginState = this.localStorageService.retrieve('loginstate');
        this.themeSelected = this.localStorageService.retrieve('theme');

        this.darkThemeMq = this.window.matchMedia('(prefers-color-scheme: dark)');

        this.darkThemeMq.addEventListener('change', e => {
            this.themeSelected = this.localStorageService.retrieve('theme');
            if (this.themeSelected !== 'auto') {
                return;
            }
            NxConfigService.isDarkTheme = e.matches;
            if (e.matches) {
                this.window.document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                this.window.document.documentElement.setAttribute('data-theme', 'light');
            }
        });

        if (loginState) {
            await this.cloudApi.getCustomAccountProperty('theme', loginState)
                .toPromise()
                .then(result => {
                    this.userTheme = result.name;
                    this.themeSelected = result.theme;
                });
        } else {
            this.themeSelected = 'auto';
        }

        await this.setTheme(this.themeSelected, loginState);
    }

    getTheme(): string {
        return this.themeSelected;
    }

    async setTheme(themeSelected: string, username:string): Promise<void> {
        const docTheme = this.window.document.documentElement.getAttribute('data-theme');

        if (
            themeSelected === 'auto' ||
            !themeSelected ||
            !username
        ) {
            this.localStorageService.store('theme', 'auto');
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
            this.window.document.documentElement.setAttribute(
                'data-theme',
                NxConfigService.isDarkTheme ? 'dark' : 'light'
            );
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
