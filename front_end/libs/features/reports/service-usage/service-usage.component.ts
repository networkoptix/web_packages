import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import {
    OrgUsageReportEntry,
    PartnerUsageReportEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxServiceUsageTableComponent } from './service-usage-table/service-usage-table.component';
import { ServiceUsageStore } from './service-usage.store';
import { EntityType, FormattedUsageReportRecord } from './service-usage.types';

@Component({
    selector: 'nx-service-usage',
    templateUrl: './service-usage.component.html',
    styleUrl: './service-usage.component.scss',
    imports: [TranslateModule, NxServiceUsageTableComponent, NxPreLoaderComponent],
    providers: [ServiceUsageStore],
    standalone: true,
})
export class NxServiceUsageComponent {
    readonly serviceUsageStore = inject(ServiceUsageStore);

    private entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    private entityId$$ = input.required<string>({ alias: 'entityId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });

    formattedServiceUsageRecords$$ = computed<FormattedUsageReportRecord[]>(() => {
        const records = this.serviceUsageStore.reportRecords();
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return (records as PartnerUsageReportEntry[]).map(
                ({
                    service_name,
                    used_by_organizations,
                    used_by_channel_partners,
                    channels,
                    monthly_rate,
                    daily_rate,
                }) => ({
                    serviceName: service_name,
                    usedBy: `Partners: ${used_by_channel_partners}, Orgs: ${used_by_organizations}`,
                    channels,
                    monthlyRate: monthly_rate,
                    fractionalUsage: daily_rate,
                }),
            );
        } else {
            return (records as OrgUsageReportEntry[]).map(
                ({ service_name, used_by, channels, monthly_rate, daily_rate }) => ({
                    serviceName: service_name,
                    usedBy: used_by,
                    channels,
                    monthlyRate: monthly_rate,
                    fractionalUsage: daily_rate,
                }),
            );
        }
    });

    loadServiceUsageEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();

        const startTs = '';
        const endTs = '';
        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceUsageStore.loadPartnerServiceUsage(entityId, startTs, endTs);
            } else {
                this.serviceUsageStore.loadOrgServiceUsage(entityId, startTs, endTs);
            }
        });
    });
}
