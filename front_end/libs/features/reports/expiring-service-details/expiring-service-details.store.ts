import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import {
    AvailableService,
    CloudSystem,
    EntityExpiringServiceEntry,
    GroupStructureItem,
    OrgExpiringServiceReportResponse,
    PartnerExpiringServiceReportResponse,
    Service,
    SystemExpiringServiceEntry,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxGroupPathService } from '../group-path/groupPath.service';
import { GroupMap, SystemMap, SystemToGroupPathMap } from '../group-path/groupPath.service.types';
import { HiddenNameLink } from '../hidden-name-link/hidden-name-link.types';

import {
    EntityFormattedExpiringServiceRecord,
    ExpiringServiceTotals,
    SystemFormattedExpiringServiceRecord,
} from './expiring-service-details.types';

interface ExpiringServiceDetailsState {
    error: string;
    hasError: boolean;
    isLoading: boolean;
    entityExpiringServices: EntityExpiringServiceEntry[];
    systemExpiringServices: SystemExpiringServiceEntry[];
    selectedService: Service | undefined;
    groupMap: GroupMap;
    systemMap: SystemMap;
    systemToGroupPathMap: SystemToGroupPathMap;
}

const initialState: ExpiringServiceDetailsState = {
    error: '',
    hasError: false,
    isLoading: true,
    entityExpiringServices: [],
    systemExpiringServices: [],
    selectedService: undefined,
    groupMap: new Map(),
    systemMap: new Map(),
    systemToGroupPathMap: new Map(),
};

function formatDate(date: string, dateTimeFormat: NxDateTimeFormatService): string {
    if (date) {
        const [year, month, day] = date.split('-').map(d => Number(d));
        return dateTimeFormat.mediumDateString(new Date(year, month - 1, day));
    }
    return '';
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
    withComputed(
        (
            store,
            dateTimeFormat = inject(NxDateTimeFormatService),
            route = inject(ActivatedRoute),
            groupPathService = inject(NxGroupPathService),
        ) => ({
            entityExpiringServicesForTable$$: computed<EntityFormattedExpiringServiceRecord[]>(() =>
                store
                    .entityExpiringServices()
                    .map(({ id, type, name, channels, expirations }, i) => {
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
                            channels,
                            expirationDate: formatExpirations(expirations, dateTimeFormat),
                            hasMultipleExpirations: expirations.length > 1,
                        };
                    }),
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
            systemExpiringServicesForTable$$: computed<SystemFormattedExpiringServiceRecord[]>(
                () => {
                    const groupMap = store.groupMap();
                    const systemMap = store.systemMap();
                    const systemToGroupPathMap = store.systemToGroupPathMap();
                    return store
                        .systemExpiringServices()
                        .map(({ system_id, channels, expiration_date }) => ({
                            id: system_id,
                            type: 'system',
                            usedByPath: groupPathService.getFormattedGroupPath(
                                system_id,
                                groupMap,
                                systemMap,
                                systemToGroupPathMap,
                            ),
                            channels,
                            expirationDate: formatDate(expiration_date, dateTimeFormat),
                            hasMultipleExpirations: false,
                        }));
                },
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
        }),
    ),
    withMethods(
        (
            store,
            CPService = inject(NxChannelPartnersService),
            groupPathService = inject(NxGroupPathService),
        ) => ({
            async loadPartnerExpiringServiceReport(
                partnerId: string,
                serviceId: string,
                startTs: string,
            ): Promise<void> {
                patchState(store, { error: '', hasError: false, isLoading: true });
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
                        error: error?.detail ?? 'Error loading report.',
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
                patchState(store, { error: '', hasError: false, isLoading: true });
                let serviceReportResponse: OrgExpiringServiceReportResponse;
                let servicesResponse: AvailableService[];
                let systemsResponse: CloudSystem[];
                let groupsResponse: GroupStructureItem[];
                let selectedService: Service | undefined;
                try {
                    const serviceReportPromise = firstValueFrom(
                        CPService.getOrganizationExpiringServiceReport(orgId, serviceId, startTs),
                    );
                    const servicesPromise = firstValueFrom(
                        CPService.getOrganizationServices(orgId),
                    );
                    const systemsPromise = firstValueFrom(CPService.getOrgSystems(orgId));
                    const groupsPromise = firstValueFrom(CPService.getGroupsStructure(orgId));
                    [serviceReportResponse, servicesResponse, systemsResponse, groupsResponse] =
                        await Promise.all([
                            serviceReportPromise,
                            servicesPromise,
                            systemsPromise,
                            groupsPromise,
                        ]);
                    selectedService = servicesResponse.find(
                        ({ service }) => service.id === serviceId,
                    )?.service;
                } catch ({ error }) {
                    patchState(store, {
                        error: error?.detail ?? 'Error loading report.',
                        hasError: true,
                        isLoading: false,
                    });
                    return;
                }
                const groupMap = groupPathService.createGroupMap(groupsResponse);
                const systemMap = groupPathService.createSystemMap(systemsResponse);
                const systemToGroupPathMap = groupPathService.createSystemToGroupPathMap(
                    systemsResponse,
                    groupMap,
                );
                patchState(store, {
                    isLoading: false,
                    entityExpiringServices: [],
                    systemExpiringServices: serviceReportResponse.systems,
                    selectedService,
                    groupMap,
                    systemMap,
                    systemToGroupPathMap,
                });
            },
        }),
    ),
);
