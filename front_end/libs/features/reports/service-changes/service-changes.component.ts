import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import {
    selectOrgsFromStructure,
    selectPartnersFromStructure,
} from '@store/channel-partners/channel-partners.selectors';
import { dateToYMD, MS } from '@utils/general';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxMonthSelectComponent } from '../month-select/month-select.component';
import { EntityType } from '../reports.types';

import { ServiceChangesStore } from './service-changes.store';
import {
    FormattedOrgServiceChangeRecord,
    FormattedPartnerServiceChangeRecord,
} from './service-changes.types';
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
    private partners$$ = this.store.selectSignal(selectPartnersFromStructure);
    private organizations$$ = this.store.selectSignal(selectOrgsFromStructure);

    selectedEntityName$$ = input.required<string>({ alias: 'entityName' });
    isPartner$$ = computed(() => this.entityType$$() === EntityType.channelPartner);
    formattedPartnerServiceChangeRecords$$ = computed<FormattedPartnerServiceChangeRecord[]>(() => {
        const records = this.serviceChangesStore.records();
        const partners = this.partners$$();
        const organizations = this.organizations$$();
        const isPartner = this.isPartner$$();
        const serviceIdToNameMap = this.serviceChangesStore.serviceIdToNameMap();

        return isPartner
            ? records.map(({ serviceId, amount, changedAtId, date: dateTimeString }) => ({
                  serviceName: serviceIdToNameMap.get(serviceId) ?? '',
                  amount,
                  changedAtName:
                      partners.get(changedAtId)?.name ?? organizations.get(changedAtId)?.name ?? '',
                  date: this.dateTimeService.mediumDateShortTimeString(new Date(dateTimeString)),
              }))
            : [];
    });
    formattedOrgServiceChangeRecords$$ = computed<FormattedOrgServiceChangeRecord[]>(() => {
        const isPartner = this.isPartner$$();
        const records = this.serviceChangesStore.records();
        const serviceIdToNameMap = this.serviceChangesStore.serviceIdToNameMap();

        return !isPartner
            ? records.map(({ serviceId, amount, changedAtId, date: dateTimeString }) => ({
                  serviceName: serviceIdToNameMap.get(serviceId) ?? '',
                  amount,
                  changedAtPath: this.serviceChangesStore.getFormattedGroupPath(changedAtId),
                  date: this.dateTimeService.mediumDateShortTimeString(new Date(dateTimeString)),
              }))
            : [];
    });

    loadServiceChangesEffect = effect(() => {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const date = new Date();
        date.setMonth(this.monthIndex());
        date.setFullYear(this.year());

        const startTs = dateToYMD(new Date(date).setDate(0));
        const endTs = dateToYMD(new Date(date).getTime() + MS.day);
        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceChangesStore.loadPartnerServiceChanges(entityId, startTs, endTs);
            } else {
                this.serviceChangesStore.loadOrgServiceChanges(entityId, startTs, endTs);
            }
        });
    });
}
