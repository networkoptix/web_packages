import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxPageMetaService } from '@services/page-meta.service';

import { meta } from '../variables/static-variables';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxPageService {
    constructor(
        private router: Router,
        private metaService: NxPageMetaService,
    ) {}

    public pageTitle(title: string, description: string = '') {
        this.metaService.setMetaProperties(this.router.url, { title, description });
    }

    public set pageDescription(content: any) {
        this.metaService.updateLookups('description', content);
    }

    public setDefaultLayout(): void {
        this.metaService.updateLookups('viewport', meta.viewport.default);
    }

    public setDesktopLayout(): void {
        this.metaService.updateLookups('viewport', meta.viewport.desktopLayout);
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
