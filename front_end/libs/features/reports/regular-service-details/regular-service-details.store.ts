import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import {
    FormattedRegularServiceRecord,
    RegularServiceTotals,
} from '@pages/reports/regular-service-details/regular-service-details.types';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import {
    AvailableService,
    EntityRegularServiceEntry,
    OrgRegularServiceReportResponse,
    PartnerRegularServiceReportResponse,
    Service,
    SystemRegularServiceEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { HiddenNameLink } from '../hidden-name-link/hidden-name-link.types';

interface RegularServiceDetailsState {
    error: string;
    hasError: boolean;
    isLoading: boolean;
    entityRegularServices: EntityRegularServiceEntry[];
    systemRegularServices: SystemRegularServiceEntry[];
    selectedService: Service | undefined;
}

const initialState: RegularServiceDetailsState = {
    error: '',
    hasError: false,
    isLoading: true,
    entityRegularServices: [],
    systemRegularServices: [],
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

export const RegularServiceDetailsStore = signalStore(
    withState(initialState),
    withComputed(
        (
            store,
            dateTimeFormat = inject(NxDateTimeFormatService),
            route = inject(ActivatedRoute),
        ) => ({
            entityRegularServicesForTable$$: computed<FormattedRegularServiceRecord[]>(() =>
                store
                    .entityRegularServices()
                    .map(
                        (
                            {
                                id,
                                type,
                                name,
                                changes_count,
                                last_changed,
                                channels,
                                monthly_rate,
                                daily_rate,
                            },
                            i,
                        ) => {
                            let usedBy: string | HiddenNameLink;
                            if (name === '**REDACTED**') {
                                const { params } = route.snapshot;
                                const currentUrl = window.location.href;
                                usedBy = {
                                    name: `Hidden Name ${i + 1}`,
                                    url: currentUrl.replace(params.entityId, id),
                                };
                            } else {
                                usedBy = name;
                            }
                            return {
                                id,
                                type,
                                usedBy,
                                changed: getChangedColumnText(
                                    changes_count,
                                    last_changed,
                                    dateTimeFormat,
                                ),
                                channels,
                                monthlyRate: monthly_rate,
                                fractionalUsage: daily_rate,
                            };
                        },
                    ),
            ),
            entityRegularServiceTotals$$: computed<RegularServiceTotals>(() =>
                store.entityRegularServices().reduce(
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
            systemRegularServicesForTable$$: computed<FormattedRegularServiceRecord[]>(() =>
                store
                    .systemRegularServices()
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
                            changed: getChangedColumnText(
                                changes_count,
                                last_changed,
                                dateTimeFormat,
                            ),
                            channels,
                            monthlyRate: monthly_rate,
                            fractionalUsage: daily_rate,
                        }),
                    ),
            ),
            systemRegularServiceTotals$$: computed<RegularServiceTotals>(() =>
                store.systemRegularServices().reduce(
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
        }),
    ),
    withMethods((store, CPService = inject(NxChannelPartnersService)) => ({
        async loadPartnerRegularServiceReport(
            partnerId: string,
            serviceId: string,
            startTs: string,
        ): Promise<void> {
            patchState(store, { error: '', hasError: false, isLoading: true });
            let serviceReportResponse: PartnerRegularServiceReportResponse;
            let services: Service[];
            let selectedService: Service | undefined;
            try {
                const serviceReportPromise = firstValueFrom(
                    CPService.getPartnerRegularServiceReport(partnerId, serviceId, startTs),
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
                entityRegularServices: serviceReportResponse.sub_entities,
                systemRegularServices: [],
                selectedService,
            });
        },
        async loadOrgRegularServiceReport(
            orgId: string,
            serviceId: string,
            startTs: string,
        ): Promise<void> {
            patchState(store, { error: '', hasError: false, isLoading: true });
            let serviceReportResponse: OrgRegularServiceReportResponse;
            let servicesResponse: AvailableService[];
            let selectedService: Service | undefined;
            try {
                const serviceReportPromise = firstValueFrom(
                    CPService.getOrganizationRegularServiceReport(orgId, serviceId, startTs),
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
                entityRegularServices: [],
                systemRegularServices: serviceReportResponse.systems,
                selectedService,
            });
        },
    })),
);
