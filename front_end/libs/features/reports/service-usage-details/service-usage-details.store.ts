import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import dateFormat from 'dateformat';
import { firstValueFrom } from 'rxjs';

import { FormattedServiceDetailRecord } from '@pages/reports/service-usage-details/service-usage-details.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    EntityServiceChangeEntry,
    Service,
    SystemServiceChangeEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

interface ServiceUsageDetailsState {
    isLoading: boolean;
    entityServiceChanges: EntityServiceChangeEntry[];
    systemServiceChanges: SystemServiceChangeEntry[];
    selectedService: Service | undefined;
}

const initialState: ServiceUsageDetailsState = {
    isLoading: true,
    entityServiceChanges: [],
    systemServiceChanges: [],
    selectedService: undefined,
};

const getChangedColumnText = (changesCount: number, lastChanged: string): string => {
    if (changesCount === 0) {
        return 'Previous periods';
    } else if (changesCount === 1) {
        return dateFormat(lastChanged, 'd mmm yyyy');
    } else {
        return 'Multiple dates';
    }
};

export const ServiceUsageDetailsStore = signalStore(
    withState(initialState),
    withComputed(store => ({
        entityServiceChangesForTable$$: computed<FormattedServiceDetailRecord[]>(() =>
            store
                .entityServiceChanges()
                .map(
                    ({
                        id,
                        type,
                        name,
                        changes_count,
                        last_changed,
                        channels,
                        monthly_rate,
                        daily_rate,
                    }) => ({
                        id,
                        type,
                        usedBy: name,
                        changed: getChangedColumnText(changes_count, last_changed),
                        activeChannels: channels,
                        monthlyRate: monthly_rate,
                        fractionalUsage: daily_rate,
                    }),
                ),
        ),
        systemServiceChangesForTable$$: computed<FormattedServiceDetailRecord[]>(() =>
            store
                .systemServiceChanges()
                .map(
                    ({
                        system_id,
                        system_name,
                        changes_count,
                        last_changed,
                        channels,
                        monthly_rate,
                        daily_rate,
                    }) => ({
                        id: system_id,
                        type: 'system',
                        usedBy: system_name,
                        changed: getChangedColumnText(changes_count, last_changed),
                        activeChannels: channels,
                        monthlyRate: monthly_rate,
                        fractionalUsage: daily_rate,
                    }),
                ),
        ),
    })),
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
                entityServiceChanges: serviceReportResponse.sub_entities,
                systemServiceChanges: [],
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
                entityServiceChanges: [],
                systemServiceChanges: serviceReportResponse.systems,
                selectedService,
            });
        },
    })),
);
