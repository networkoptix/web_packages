import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxCloudApiService } from '@services/nx-cloud-api';

import { NxCardComponent } from '../../home/components/card/card.component';

type SiteData = {
    id: string;
    name: string;
};

@Component({
    selector: 'nx-existing-site-deployment',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['existing-site-deployment.component.scss'],
    templateUrl: 'existing-site-deployment.component.html',
    imports: [CommonModule, NxPreLoaderComponent, NxCardComponent, NxCardComponent, RouterLink],
})
export class ExistingSiteDeployment {
    loading = signal(true);

    sites = signal<SiteData[]>([]);

    cloudApiService = inject(NxCloudApiService);
    constructor() {
        this.cloudApiService.systems().subscribe(sites => {
            this.sites.set(sites);
            this.loading.set(false);
        });
    }
}
