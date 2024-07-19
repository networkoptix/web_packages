import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import {
    AvailableService,
    EntityExpiringServiceEntry,
    OrgExpiringServiceReportResponse,
    PartnerExpiringServiceReportResponse,
    Service,
    SystemExpiringServiceEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import {
    ExpiringServiceTotals,
    FormattedExpiringServiceRecord,
} from './expiring-service-details.types';

interface ExpiringServiceDetailsState {
    error: string;
    hasError: boolean;
    isLoading: boolean;
    entityExpiringServices: EntityExpiringServiceEntry[];
    systemExpiringServices: SystemExpiringServiceEntry[];
    selectedService: Service | undefined;
}

const initialState: ExpiringServiceDetailsState = {
    error: '',
    hasError: false,
    isLoading: true,
    entityExpiringServices: [],
    systemExpiringServices: [],
    selectedService: undefined,
};

function formatDate(date: string, dateTimeFormat: NxDateTimeFormatService): string {
    const [year, month, day] = date.split('-').map(d => Number(d));
    return dateTimeFormat.mediumDateString(new Date(year, month - 1, day));
}

function formatExpirations(expirations: string[], dateTimeFormat: NxDateTimeFormatService): string {
    if (expirations.length > 1) {
        return 'Multiple Dates';
    } else if (expirations.length === 1) {
        return formatDate(expirations[0], dateTimeFormat);
    } else {
        return 'No expirations';
    }
}

export const ExpiringServiceDetailsStore = signalStore(
    withState(initialState),
    withComputed((store, dateTimeFormat = inject(NxDateTimeFormatService)) => ({
        entityExpiringServicesForTable$$: computed<FormattedExpiringServiceRecord[]>(() =>
            store.entityExpiringServices().map(({ id, name, channels, expirations }) => ({
                id,
                usedBy: name,
                channels,
                expirationDate: formatExpirations(expirations, dateTimeFormat),
            })),
        ),
        entityExpiringServiceTotals$$: computed<ExpiringServiceTotals>(() =>
            store.entityExpiringServices().reduce(
                (totals, expiringServiceEntry) => ({
                    channels: totals.channels + expiringServiceEntry.channels,
                }),
                {
                    channels: 0,
                },
            ),
        ),
        systemExpiringServicesForTable$$: computed<FormattedExpiringServiceRecord[]>(() =>
            store
                .systemExpiringServices()
                .map(({ system_id, system_name, channels, expirations }) => ({
                    id: system_id,
                    usedBy: system_name,
                    channels,
                    expirationDate: formatExpirations(expirations, dateTimeFormat),
                })),
        ),
        systemExpiringServiceTotals$$: computed<ExpiringServiceTotals>(() =>
            store.systemExpiringServices().reduce(
                (totals, expiringServiceEntry) => ({
                    channels: totals.channels + expiringServiceEntry.channels,
                }),
                {
                    channels: 0,
                },
            ),
        ),
    })),
    withMethods((store, CPService = inject(NxChannelPartnersService)) => ({
        async loadPartnerExpiringServiceReport(
            partnerId: string,
            serviceId: string,
            startTs: string,
        ): Promise<void> {
            patchState(store, { isLoading: true });
            let serviceReportResponse: PartnerExpiringServiceReportResponse;
            let services: Service[];
            let selectedService: Service | undefined;
            try {
                const serviceReportPromise = firstValueFrom(
                    CPService.getPartnerExpiringServiceReport(partnerId, serviceId, startTs),
                );
                const servicesPromise = firstValueFrom(
                    CPService.getChannelPartnerOwnedServices(partnerId),
                );
                [serviceReportResponse, services] = await Promise.all([
                    serviceReportPromise,
                    servicesPromise,
                ]);
                selectedService = services.find(service => service.id === serviceId);
            } catch ({ error }) {
                patchState(store, {
                    error: error?.join('\n') ?? '',
                    hasError: true,
                    isLoading: false,
                });
                return;
            }
            patchState(store, {
                isLoading: false,
                entityExpiringServices: serviceReportResponse.sub_entities,
                systemExpiringServices: [],
                selectedService,
            });
        },
        async loadOrgExpiringServiceReport(
            orgId: string,
            serviceId: string,
            startTs: string,
        ): Promise<void> {
            patchState(store, { isLoading: true });
            let serviceReportResponse: OrgExpiringServiceReportResponse;
            let servicesResponse: AvailableService[];
            let selectedService: Service | undefined;
            try {
                const serviceReportPromise = firstValueFrom(
                    CPService.getOrganizationExpiringServiceReport(orgId, serviceId, startTs),
                );
                const servicesPromise = firstValueFrom(CPService.getOrganizationServices(orgId));
                [serviceReportResponse, servicesResponse] = await Promise.all([
                    serviceReportPromise,
                    servicesPromise,
                ]);
                selectedService = servicesResponse.find(
                    ({ service }) => service.id === serviceId,
                )?.service;
            } catch ({ error }) {
                patchState(store, {
                    error: error?.join('\n') ?? '',
                    hasError: true,
                    isLoading: false,
                });
                return;
            }
            patchState(store, {
                isLoading: false,
                entityExpiringServices: [],
                systemExpiringServices: serviceReportResponse.systems,
                selectedService,
            });
        },
    })),
);
