import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    EntityServiceChangeEntry,
    Service,
    SystemServiceChangeEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

interface ServiceUsageDetailsState {
    isLoading: boolean;
    records: EntityServiceChangeEntry[] | SystemServiceChangeEntry[];
    selectedService: Service | undefined;
}

const initialState: ServiceUsageDetailsState = {
    isLoading: true,
    records: [],
    selectedService: undefined,
};

export const ServiceUsageDetailsStore = signalStore(
    withState(initialState),
    withMethods((store, CPService = inject(NxChannelPartnersService)) => ({
        async loadPartnerServiceReport(partnerId: string, serviceId: string): Promise<void> {
            patchState(store, { isLoading: true });
            const serviceReportPromise = firstValueFrom(
                CPService.getPartnerServiceReport(partnerId, serviceId),
            );
            const servicesPromise = firstValueFrom(
                CPService.getChannelPartnerOwnedServices(partnerId),
            );
            const [serviceReportResponse, services] = await Promise.all([
                serviceReportPromise,
                servicesPromise,
            ]);
            const selectedService = services.find(service => service.id === serviceId);
            patchState(store, {
                isLoading: false,
                records: serviceReportResponse.sub_entities,
                selectedService,
            });
        },
        async loadOrgServiceReport(orgId: string, serviceId: string): Promise<void> {
            patchState(store, { isLoading: true });
            const serviceReportPromise = firstValueFrom(
                CPService.getOrganizationServiceReport(orgId, serviceId),
            );
            const servicesPromise = firstValueFrom(CPService.getOrganizationServices(orgId));
            const [serviceReportResponse, servicesResponse] = await Promise.all([
                serviceReportPromise,
                servicesPromise,
            ]);
            const selectedService = servicesResponse.find(
                ({ service }) => service.id === serviceId,
            )?.service;
            patchState(store, {
                isLoading: false,
                records: serviceReportResponse.systems,
                selectedService,
            });
        },
    })),
);
