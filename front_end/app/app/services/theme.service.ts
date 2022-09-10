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

    constructor(
        private localStorageService: LocalStorageService,
        private cloudApi: NxCloudApiService,
        @Inject(WINDOW) private window: Window,
    ) {
    }

    initTheme(username: string = 'undefined'): void {
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

        this.setTheme(this.themeSelected, username);
    }

    getTheme(): string {
        return this.themeSelected;
    }

    setTheme(themeSelected: string, username:string): void {
        if (
            themeSelected === 'auto' ||
            themeSelected === null
        ) {
            this.localStorageService.store('theme', 'auto');
            NxConfigService.isDarkTheme = this.darkThemeMq.matches;
            this.window.document.documentElement.setAttribute(
                'data-theme',
                NxConfigService.isDarkTheme ? 'dark' : 'light'
            );
        } else {
            this.localStorageService.store('theme', themeSelected);
            NxConfigService.isDarkTheme = themeSelected === 'dark';
            this.window.document.documentElement.setAttribute(
                'data-theme',
                themeSelected
            );
        }

        username !== 'undefined' && this.cloudApi.saveCustomAccountProperty(
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
