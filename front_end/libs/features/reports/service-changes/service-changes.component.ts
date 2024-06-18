import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import {
    selectChannelPartners,
    selectOrganizations,
} from '@store/channel-partners/channel-partners.selectors';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxMonthSelectComponent } from '../month-select/month-select.component';
import { EntityType } from '../reports.types';

import { ServiceChangesStore } from './service-changes.store';
import { FormattedServiceChangeRecord } from './service-changes.types';
import { NxServiceChangesTableComponent } from './services-changes-table/service-changes-table.component';

@Component({
    selector: 'nx-service-changes',
    templateUrl: './service-changes.component.html',
    styleUrl: './service-changes.component.scss',
    imports: [
        TranslateModule,
        NxServiceChangesTableComponent,
        NxPreLoaderComponent,
        NxMonthSelectComponent,
    ],
    providers: [ServiceChangesStore],
    standalone: true,
})
export class NxServiceChangesComponent extends BaseMonthPageComponent {
    LANG = staticLang;
    readonly serviceChangesStore = inject(ServiceChangesStore);
    private readonly store = inject(Store);
    private dateTimeService = inject(NxDateTimeFormatService);

    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    entityId$$ = input.required<string>({ alias: 'entityId' });
    private channelPartners$$ = this.store.selectSignal<ChannelPartner[]>(selectChannelPartners);
    private organizations$$ = this.store.selectSignal<Organization[]>(selectOrganizations);

    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });
    formattedServiceChangeRecords$$ = computed<FormattedServiceChangeRecord[]>(() => {
        const records = this.serviceChangesStore.records();
        const channelPartners = this.channelPartners$$();
        const organizations = this.organizations$$();
        const serviceIdToNameMap = this.serviceChangesStore.serviceIdToNameMap();

        const cpIdToNameMap = new Map(channelPartners.map(({ id, name }) => [id, name]));
        const orgIdToNameMap = new Map(organizations.map(({ id, name }) => [id, name]));

        return records.map(({ serviceId, amount, changedAtId, date: dateTimeString }) => ({
            serviceName: serviceIdToNameMap.get(serviceId) || '',
            amount,
            changedAtName: cpIdToNameMap.get(changedAtId) || orgIdToNameMap.get(changedAtId) || '',
            date: this.dateTimeService.mediumDateShortTimeString(new Date(dateTimeString)),
        }));
    });

    loadServiceChangesEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();

        const startTs = '';
        const endTs = '';
        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceChangesStore.loadPartnerServiceChanges(entityId, startTs, endTs);
            } else {
                this.serviceChangesStore.loadOrgServiceChanges(entityId, startTs, endTs);
            }
        });
    });
}
