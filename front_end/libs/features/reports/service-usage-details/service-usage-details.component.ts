import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import dateFormat from 'dateformat';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import {
    EntityServiceChangeEntry,
    SystemServiceChangeEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { EntityType } from '../reports.types';
import { NxServiceUsageTableComponent } from '../service-usage/service-usage-table/service-usage-table.component';

import { NxServiceDetailsTableComponent } from './service-details-table/service-details-table.component';
import { ServiceUsageDetailsStore } from './service-usage-details.store';
import { FormattedServiceDetailRecord } from './service-usage-details.types';

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

    private getChangedColumnText(changesCount: number, lastChanged: string): string {
        if (changesCount === 0) {
            return 'Previous periods';
        } else if (changesCount === 1) {
            return dateFormat(lastChanged, 'd mmm yyyy');
        } else {
            return 'Multiple dates';
        }
    }

    formattedServiceDetailRecords$$ = computed<FormattedServiceDetailRecord[]>(() => {
        const entityType = this.entityType$$();
        const records = this.serviceUsageDetailsStore.records();

        if (entityType === EntityType.channelPartner) {
            return (records as EntityServiceChangeEntry[]).map(
                ({ name, changes_count, last_changed, channels, monthly_rate, daily_rate }) => ({
                    usedBy: name,
                    changed: this.getChangedColumnText(changes_count, last_changed),
                    activeChannels: channels,
                    monthlyRate: monthly_rate,
                    fractionalUsage: daily_rate,
                }),
            );
        } else {
            return (records as SystemServiceChangeEntry[]).map(
                ({
                    system_name,
                    changes_count,
                    last_changed,
                    channels,
                    monthly_rate,
                    daily_rate,
                }) => ({
                    usedBy: system_name,
                    changed: this.getChangedColumnText(changes_count, last_changed),
                    activeChannels: channels,
                    monthlyRate: monthly_rate,
                    fractionalUsage: daily_rate,
                }),
            );
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
