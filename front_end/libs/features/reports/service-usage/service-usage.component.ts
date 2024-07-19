import { Component, OnInit, computed, effect, inject, input, untracked } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPagePlaceholderGenericNewV2Component } from '@components/placeholdersV2/page/page-placeholder.component';
import staticLang from '@language_static';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxMonthSelectComponent } from '../month-select/month-select.component';
import { EntityType } from '../reports.types';

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
        NxMonthSelectComponent,
        NxPagePlaceholderGenericNewV2Component,
    ],
    providers: [ServiceUsageStore],
    standalone: true,
})
export class NxServiceUsageComponent extends BaseMonthPageComponent implements OnInit {
    LANG = staticLang;
    readonly serviceUsageStore = inject(ServiceUsageStore);

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });
    startTs$$ = input<string>('', { alias: 'startTs' });

    formattedServiceUsageRecords$$ = computed<FormattedUsageReportRecord[]>(() => {
        const entityType = this.entityType$$();
        if (entityType === EntityType.channelPartner) {
            return this.serviceUsageStore.partnerUsageReportsForTable$$();
        } else {
            return this.serviceUsageStore.orgUsageReportsForTable$$();
        }
    });
    error = this.serviceUsageStore.error;
    hasError = this.serviceUsageStore.hasError;

    loadServiceUsageEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const startTs = this.requestStartString();
        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceUsageStore.loadPartnerServiceUsage(entityId, startTs);
            } else {
                this.serviceUsageStore.loadOrgServiceUsage(entityId, startTs);
            }
        });
    });

    ngOnInit(): void {
        const now = new Date();
        const startTs = this.startTs$$();
        if (startTs) {
            const [year, month] = startTs.split('-').map(part => parseInt(part));
            this.year.set(year);
            this.monthIndex.set(Math.max(0, month - 1));
        }
        if (now.getDate() === 1) {
            if (now.getMonth() === 1) {
                this.year.set(now.getFullYear() - 1);
                this.monthIndex.set(11);
            } else {
                this.monthIndex.set(now.getMonth() - 1);
            }
        }
    }
}
