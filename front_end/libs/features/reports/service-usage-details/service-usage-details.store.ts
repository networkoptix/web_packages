import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import {
    FormattedServiceDetailRecord,
    ServiceDetailTotals,
} from '@pages/reports/service-usage-details/service-usage-details.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
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

const getChangedColumnText = (
    changesCount: number,
    lastChanged: string,
    dateTimeFormat: NxDateTimeFormatService,
): string => {
    if (changesCount === 0) {
        return 'Previous periods';
    } else if (changesCount === 1) {
        const [year, month, day] = lastChanged.split('-').map(d => Number(d));
        return dateTimeFormat.mediumDateString(new Date(year, month - 1, day));
    } else {
        return 'Multiple dates';
    }
};

export const ServiceUsageDetailsStore = signalStore(
    withState(initialState),
    withComputed((store, dateTimeFormat = inject(NxDateTimeFormatService)) => ({
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
                        changed: getChangedColumnText(changes_count, last_changed, dateTimeFormat),
                        channels,
                        monthlyRate: monthly_rate,
                        fractionalUsage: daily_rate,
                    }),
                ),
        ),
        entityServiceChangeTotals$$: computed<ServiceDetailTotals>(() =>
            store.entityServiceChanges().reduce(
                ({ channels, monthlyRate, fractionalUsage }, serviceChangeEntry) => ({
                    channels: channels + serviceChangeEntry.channels,
                    monthlyRate: monthlyRate + serviceChangeEntry.monthly_rate,
                    fractionalUsage: fractionalUsage + serviceChangeEntry.daily_rate,
                }),
                {
                    channels: 0,
                    monthlyRate: 0,
                    fractionalUsage: 0,
                },
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
                        changed: getChangedColumnText(changes_count, last_changed, dateTimeFormat),
                        channels,
                        monthlyRate: monthly_rate,
                        fractionalUsage: daily_rate,
                    }),
                ),
        ),
        systemServiceChangeTotals$$: computed<ServiceDetailTotals>(() =>
            store.systemServiceChanges().reduce(
                ({ channels, monthlyRate, fractionalUsage }, serviceChangeEntry) => ({
                    channels: channels + serviceChangeEntry.channels,
                    monthlyRate: monthlyRate + serviceChangeEntry.monthly_rate,
                    fractionalUsage: fractionalUsage + serviceChangeEntry.daily_rate,
                }),
                {
                    channels: 0,
                    monthlyRate: 0,
                    fractionalUsage: 0,
                },
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
