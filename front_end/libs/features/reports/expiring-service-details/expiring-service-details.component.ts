import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { icons } from '@static-variables';

import { EntityType } from '../reports.types';
import { NxServiceUsageTableComponent } from '../service-usage/service-usage-table/service-usage-table.component';

import { ExpiringServiceDetailsStore } from './expiring-service-details.store';
import {
    FormattedExpiringServiceRecord,
    ExpiringServiceTotals,
} from './expiring-service-details.types';
import { NxExpiringServiceTableComponent } from './expiring-service-table/expiring-service-table.component';

@Component({
    selector: 'nx-expiring-service-details',
    templateUrl: './expiring-service-details.component.html',
    styleUrls: ['./expiring-service-details.component.scss'],
    imports: [
        TranslateModule,
        NxServiceUsageTableComponent,
        NxPreLoaderComponent,
        NxExpiringServiceTableComponent,
        AngularSvgIconModule,
        NxAddSvgSrcDirective,
        NxPagePlaceholderGenericNewV2Component,
    ],
    providers: [ExpiringServiceDetailsStore],
    standalone: true,
})
export class NxExpiringServiceDetailsComponent {
    LANG = staticLang;
    icons = icons;
    readonly expiringServiceDetailsStore = inject(ExpiringServiceDetailsStore);
    constructor(private router: Router) {}

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    serviceId$$ = input.required<string>({ alias: 'serviceId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });
    startTs = input<string>('');

    error = this.expiringServiceDetailsStore.error;
    hasError = this.expiringServiceDetailsStore.hasError;

    formattedExpiringServiceRecords$$ = computed<FormattedExpiringServiceRecord[]>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.expiringServiceDetailsStore.entityExpiringServicesForTable$$();
        } else {
            return this.expiringServiceDetailsStore.systemExpiringServicesForTable$$();
        }
    });

    expiringServiceTotals$$ = computed<ExpiringServiceTotals>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.expiringServiceDetailsStore.entityExpiringServiceTotals$$();
        } else {
            return this.expiringServiceDetailsStore.systemExpiringServiceTotals$$();
        }
    });

    loadExpiringServiceReportEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const serviceId = this.serviceId$$();
        const startTs = this.startTs();

        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.expiringServiceDetailsStore.loadPartnerExpiringServiceReport(
                    entityId,
                    serviceId,
                    startTs,
                );
            } else {
                this.expiringServiceDetailsStore.loadOrgExpiringServiceReport(
                    entityId,
                    serviceId,
                    startTs,
                );
            }
        });
    });

    goBack(): void {
        const urlSegments = this.router.url.split('/');
        this.router.navigate(urlSegments.slice(0, urlSegments.indexOf('service-usage') + 1), {
            queryParams: { startTs: this.startTs() },
        });
    }
}
