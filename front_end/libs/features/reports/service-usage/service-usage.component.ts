import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxMonthSelectComponent } from '../month-select/month-select.component';
import { EntityType } from '../reports.types';
import { NxServiceUsageDetailsComponent } from '../service-usage-details/service-usage-details.component';

import { NxServiceUsageTableComponent } from './service-usage-table/service-usage-table.component';
import { ServiceUsageStore } from './service-usage.store';
import { FormattedUsageReportRecord } from './service-usage.types';

@Component({
    selector: 'nx-service-usage',
    templateUrl: './service-usage.component.html',
    styleUrl: './service-usage.component.scss',
    imports: [
        TranslateModule,
        NxServiceUsageTableComponent,
        NxPreLoaderComponent,
        NxServiceUsageDetailsComponent,
        NxMonthSelectComponent,
    ],
    providers: [ServiceUsageStore],
    standalone: true,
})
export class NxServiceUsageComponent extends BaseMonthPageComponent {
    LANG = staticLang;
    readonly serviceUsageStore = inject(ServiceUsageStore);

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });

    formattedServiceUsageRecords$$ = computed<FormattedUsageReportRecord[]>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.serviceUsageStore.partnerUsageReportsForTable$$();
        } else {
            return this.serviceUsageStore.orgUsageReportsForTable$$();
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
