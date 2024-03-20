import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';

import { ServiceChangeRecord } from './service-changes.types';

interface ServiceChangesState {
    isLoading: boolean;
    records: ServiceChangeRecord[];
}

const initialState: ServiceChangesState = {
    isLoading: true,
    records: [],
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
                const serviceChangesResponse = await firstValueFrom(
                    CPService.getPartnerServiceChanges(entityId, startTs, endTs),
                );
                const serviceChangeRecords = serviceChangesResponse.results.map(
                    ({ serviceId, changeQuantity, organizationId, channelPartnerId, date }) => ({
                        serviceName: serviceId,
                        amount: changeQuantity,
                        addedTo: organizationId || channelPartnerId,
                        date,
                    }),
                );
                patchState(store, {
                    isLoading: false,
                    records: serviceChangeRecords,
                });
            },
            async loadOrgServiceChanges(
                entityId: string,
                startTs: string,
                endTs: string,
            ): Promise<void> {
                patchState(store, { isLoading: true });
                const serviceChangesResponse = await firstValueFrom(
                    CPService.getOrganizationServiceChanges(entityId, startTs, endTs),
                );
                const serviceChangeRecords = serviceChangesResponse.results.map(
                    ({ changeQuantity, service, date }) => ({
                        serviceName: service.displayName,
                        amount: changeQuantity,
                        addedTo: service.id,
                        date,
                    }),
                );
                patchState(store, {
                    isLoading: false,
                    records: serviceChangeRecords,
                });
            },
        }),
    ),
);
