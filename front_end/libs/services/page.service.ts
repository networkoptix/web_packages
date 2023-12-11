import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';

import { Meta } from '@services/nx-config/base-config';
import { NxPageMetaService } from '@services/page-meta.service';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class NxPageService {
    readonly meta: Meta = {
        viewport: {
            default:
                'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no',
            desktopLayout: 'width=768, maximum-scale=1, user-scalable=yes, shrink-to-fit=no',
        },
    };

    constructor(
        private router: Router,
        private metaService: NxPageMetaService,
    ) {}

    public pageTitle(title: string, description: string = ''): void {
        this.metaService.setMetaProperties(this.router.url, { title, description });
    }

    public set pageDescription(content: string) {
        this.metaService.updateLookups('description', content);
    }

    public setDefaultLayout(): void {
        this.metaService.updateLookups('viewport', this.meta.viewport.default);
    }

    public setDesktopLayout(): void {
        this.metaService.updateLookups('viewport', this.meta.viewport.desktopLayout);
    }

    public redirect404 = (message = ''): ReturnType<Router['navigate']> => {
        const queryParams: Record<string, string> = {};

        if (message && typeof message === 'string') {
            queryParams.message = message;
        }

        return this.router
            .navigate(['404'], {
                replaceUrl: true,
                queryParams,
            })
            .catch(error => {
                console.error(error);
                return false;
            });
    };
}
