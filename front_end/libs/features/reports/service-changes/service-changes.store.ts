import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';

import { ServiceChangeRecord } from './service-changes.types';

interface ServiceChangesState {
    isLoading: boolean;
    records: ServiceChangeRecord[];
    serviceIdToNameMap: Map<string, string>;
}

const initialState: ServiceChangesState = {
    isLoading: true,
    records: [],
    serviceIdToNameMap: new Map(),
};

export const ServiceChangesStore = signalStore(
    withState(initialState),
    withMethods(
        (store, CPService = inject(NxChannelPartnersService), rootStore = inject(Store)) => ({
            async loadPartnerServiceChanges(
                entityId: string,
                startTs: string,
                endTs: string,
            ): Promise<void> {
                patchState(store, { isLoading: true });
                const serviceChangeRecordsPromise = firstValueFrom(
                    CPService.getPartnerServiceChanges(entityId, startTs, endTs),
                );
                const servicesPromise = firstValueFrom(
                    CPService.getChannelPartnerOwnedServices(entityId),
                );
                const [serviceChangeRecordsResponse, servicesResponse] = await Promise.all([
                    serviceChangeRecordsPromise,
                    servicesPromise,
                ]);
                const serviceIdToNameMap = new Map(
                    servicesResponse.map(({ id, displayName }) => [id, displayName]),
                );
                const serviceChangeRecords = serviceChangeRecordsResponse.results.map(
                    ({ serviceId, changeQuantity, organizationId, channelPartnerId, date }) => ({
                        serviceId,
                        amount: changeQuantity,
                        changedAtId: organizationId || channelPartnerId,
                        date,
                    }),
                );
                patchState(store, {
                    isLoading: false,
                    records: serviceChangeRecords,
                    serviceIdToNameMap,
                });
            },
            async loadOrgServiceChanges(
                entityId: string,
                startTs: string,
                endTs: string,
            ): Promise<void> {
                patchState(store, { isLoading: true });
                const serviceChangeRecordsPromise = firstValueFrom(
                    CPService.getOrganizationServiceChanges(entityId, startTs, endTs),
                );
                const servicesPromise = firstValueFrom(CPService.getOrganizationServices(entityId));
                const [serviceChangeRecordsResponse, servicesResponse] = await Promise.all([
                    serviceChangeRecordsPromise,
                    servicesPromise,
                ]);
                const serviceIdToNameMap = new Map(
                    servicesResponse.map(({ service }) => [service.id, service.displayName]),
                );
                const serviceChangeRecords = serviceChangeRecordsResponse.results.map(
                    ({ changeQuantity, service, date }) => ({
                        serviceId: service.id,
                        amount: changeQuantity,
                        changedAtId: entityId,
                        date,
                    }),
                );
                patchState(store, {
                    isLoading: false,
                    records: serviceChangeRecords,
                    serviceIdToNameMap,
                });
            },
        }),
    ),
);
