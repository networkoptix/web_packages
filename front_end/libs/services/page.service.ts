import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageMetaService } from '@services/page-meta.service';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxPageService {
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private metaService: NxPageMetaService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    public pageTitle(title: string, description: string = '') {
        this.metaService.setMetaProperties(this.router.url, { title, description });
    }

    public set pageDescription(content: any) {
        this.metaService.updateLookups('description', content);
    }

    public setDefaultLayout(): void {
        this.metaService.updateLookups('viewport', this.CONFIG.meta.viewport.default);
    }

    public setDesktopLayout(): void {
        this.metaService.updateLookups('viewport', this.CONFIG.meta.viewport.desktopLayout);
    }

    public redirect404 = (message = ''): void => {
        const queryParams: Record<string, string> = {};

        if (message) {
            queryParams.message = message;
        }

        this.router
            .navigate(['404'], {
                replaceUrl: true,
                queryParams
            })
            .catch(error => {
                console.error(error);
            });
    };
}
