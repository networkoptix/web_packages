import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';

import { EntityType } from '../reports.types';
import { NxServiceUsageTableComponent } from '../service-usage/service-usage-table/service-usage-table.component';

import { NxServiceDetailsTableComponent } from './service-details-table/service-details-table.component';
import { ServiceUsageDetailsStore } from './service-usage-details.store';
import { FormattedServiceDetailRecord, ServiceDetailTotals } from './service-usage-details.types';

@Component({
    selector: 'nx-service-usage-details',
    templateUrl: './service-usage-details.component.html',
    styleUrls: ['./service-usage-details.component.scss'],
    imports: [
        TranslateModule,
        NxServiceUsageTableComponent,
        NxPreLoaderComponent,
        NxServiceDetailsTableComponent,
    ],
    providers: [ServiceUsageDetailsStore],
    standalone: true,
})
export class NxServiceUsageDetailsComponent {
    readonly serviceUsageDetailsStore = inject(ServiceUsageDetailsStore);
    constructor(private router: Router) {}

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    serviceId$$ = input.required<string>({ alias: 'serviceId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });

    formattedServiceDetailRecords$$ = computed<FormattedServiceDetailRecord[]>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.serviceUsageDetailsStore.entityServiceChangesForTable$$();
        } else {
            return this.serviceUsageDetailsStore.systemServiceChangesForTable$$();
        }
    });

    serviceDetailTotals$$ = computed<ServiceDetailTotals>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.serviceUsageDetailsStore.entityServiceChangeTotals$$();
        } else {
            return this.serviceUsageDetailsStore.systemServiceChangeTotals$$();
        }
    });

    loadServiceReportEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const serviceId = this.serviceId$$();

        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceUsageDetailsStore.loadPartnerServiceReport(entityId, serviceId);
            } else {
                this.serviceUsageDetailsStore.loadOrgServiceReport(entityId, serviceId);
            }
        });
    });

    goBack(): void {
        const urlSegments = this.router.url.split('/');
        urlSegments.pop();
        this.router.navigate(urlSegments);
    }
}
