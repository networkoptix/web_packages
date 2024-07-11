import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PageChange } from '@components/table/table.types';
import staticLang from '@language_static';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { NxUriService } from '@services/uri.service';
import {
    selectOrgsFromStructure,
    selectPartnersFromStructure,
} from '@store/channel-partners/channel-partners.selectors';

import { BaseMonthPageComponent } from '../month-select/base-month-page.component';
import { NxMonthSelectComponent } from '../month-select/month-select.component';
import { EntityType } from '../reports.types';

import { apiPageSize, ServiceChangesStore } from './service-changes.store';
import {
    FormattedOrgServiceChangeRecord,
    FormattedPartnerServiceChangeRecord,
} from './service-changes.types';
import { getNextApiPage, isTablePageOutsideLoadedApiPage } from './service-changes.utils';
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
    private uri = inject(NxUriService);

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
                      partners.get(changedAtId)?.name ??
                      organizations.get(changedAtId)?.name ??
                      changedAtId,
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

    loadRecords(page: number): void {
        const entityType = this.entityType$$();
        const entityId = this.entityId$$();
        const startTs = this.requestStartString();
        const endTs = this.requestEndString();
        untracked(() => {
            if (entityType === EntityType.channelPartner) {
                this.serviceChangesStore.loadPartnerServiceChanges(entityId, startTs, endTs, page);
            } else {
                this.serviceChangesStore.loadOrgServiceChanges(entityId, startTs, endTs, page);
            }
        });
    }

    params$$ = toSignal(this.uri.getParams());
    // This effect handles the initial page load, and tracks the signals accessed in loadRecords()
    loadServiceChangesEffect = effect(() => {
        // We don't want to track the table page url param because it is updated on every table page change,
        // and we only want to load new records on API page change.
        const urlQueryParams = untracked(this.params$$);
        const tablePageFromUrl = urlQueryParams?.page ? Number(urlQueryParams?.page) : undefined;
        if (tablePageFromUrl) {
            // This matches the internal nx-table default. We could update nx-table to accept a default page size as an input
            const tablePageSize = 10;
            const apiPage = Math.ceil((tablePageFromUrl * tablePageSize) / apiPageSize);
            this.loadRecords(apiPage);
        } else {
            this.loadRecords(1);
        }
    });

    handlePageChange(pageChange: PageChange): void {
        const currentApiPage = this.serviceChangesStore.currentPage();
        const { page: tablePage, pageSize: tablePageSize } = pageChange;
        if (
            currentApiPage &&
            isTablePageOutsideLoadedApiPage(tablePage, tablePageSize, currentApiPage)
        ) {
            const nextApiPage = getNextApiPage(tablePage, tablePageSize, currentApiPage);
            this.loadRecords(nextApiPage);
        }
    }
}
