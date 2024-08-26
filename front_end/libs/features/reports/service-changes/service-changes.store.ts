import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    AvailableService,
    CloudSystem,
    GroupStructureItem,
    OrgServiceChangesResponse,
    PartnerServiceChangesResponse,
    Service,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxGroupPathService } from '../group-path/groupPath.service';
import { GroupMap, SystemMap, SystemToGroupPathMap } from '../group-path/groupPath.service.types';

import { ServiceChangeRecord } from './service-changes.types';

interface ServiceChangesState {
    isLoading: boolean;
    records: ServiceChangeRecord[];
    currentPage: number | undefined;
    serviceIdToNameMap: Map<string, string>;
    groupMap: GroupMap;
    systemMap: SystemMap;
    systemToGroupPathMap: SystemToGroupPathMap;
    errorMessage: string | null;
}

const initialState: ServiceChangesState = {
    isLoading: true,
    records: [],
    currentPage: undefined,
    serviceIdToNameMap: new Map(),
    groupMap: new Map(),
    systemMap: new Map(),
    systemToGroupPathMap: new Map(),
    errorMessage: null,
};

export const apiPageSize = 100;
const apiSort = '-created';

export const ServiceChangesStore = signalStore(
    withState(initialState),
    withMethods(
        (
            store,
            CPService = inject(NxChannelPartnersService),
            groupPathService = inject(NxGroupPathService),
            rootStore = inject(Store),
        ) => ({
            async loadPartnerServiceChanges(
                entityId: string,
                startTs: string,
                endTs: string,
                page: number,
            ): Promise<void> {
                patchState(store, { isLoading: true });
                const serviceChangeRecordsPromise = firstValueFrom(
                    CPService.getPartnerServiceChanges(
                        entityId,
                        startTs,
                        endTs,
                        page,
                        apiPageSize,
                        apiSort,
                    ),
                );
                const servicesPromise = firstValueFrom(
                    CPService.getChannelPartnerOwnedServices(entityId),
                );
                let servicesResponse: Service[];
                let serviceChangeRecordsResponse: PartnerServiceChangesResponse;
                try {
                    [servicesResponse, serviceChangeRecordsResponse] = await Promise.all([
                        servicesPromise,
                        serviceChangeRecordsPromise,
                    ]);
                } catch (error) {
                    // handles invalid page in url query param on initial load
                    if (error.error.detail) {
                        patchState(store, state => ({
                            isLoading: false,
                            errorMessage: error.error.detail,
                        }));
                        return;
                    }
                    throw error;
                }
                const serviceIdToNameMap = new Map(
                    servicesResponse.map(({ id, displayName }) => [id, displayName]),
                );

                // Syncronize API pagination with frontend table pagination
                const { count, results } = serviceChangeRecordsResponse;
                // Create an empty records array with length equal to the total count of records
                const serviceChangeRecords = new Array(count);
                const formattedResults = results.map(
                    ({ serviceId, changeQuantity, organizationId, channelPartnerId, date }) => ({
                        serviceId,
                        amount: changeQuantity,
                        changedAtId: organizationId || channelPartnerId,
                        date,
                    }),
                );
                // Added the paginated API records to the appropriate location in the records array
                // Eg, if we are on API page 2, and the API page size is 100 records, then the frontend records array
                // will be [empty x 100, 100 records from API page 2, empty x array.length-200]
                // This allows the frontend table to properly show/paginated through the total number of records
                serviceChangeRecords.splice(
                    (page - 1) * apiPageSize,
                    formattedResults.length,
                    ...formattedResults,
                );
                patchState(store, state => ({
                    isLoading: false,
                    records: serviceChangeRecords,
                    currentPage: page,
                    serviceIdToNameMap,
                    errorMessage: null,
                }));
            },
            async loadOrgServiceChanges(
                entityId: string,
                startTs: string,
                endTs: string,
                page: number,
            ): Promise<void> {
                patchState(store, { isLoading: true });
                const serviceChangeRecordsPromise = firstValueFrom(
                    CPService.getOrganizationServiceChanges(
                        entityId,
                        startTs,
                        endTs,
                        page,
                        apiPageSize,
                        apiSort,
                    ),
                );
                const servicesPromise = firstValueFrom(CPService.getOrganizationServices(entityId));
                const systemsPromise = firstValueFrom(CPService.getOrgSystems(entityId));
                const groupsPromise = firstValueFrom(CPService.getGroupsStructure(entityId));

                let serviceChangeRecordsResponse: OrgServiceChangesResponse;
                let servicesResponse: AvailableService[];
                let systemsResponse: CloudSystem[];
                let groupsResponse: GroupStructureItem[];
                try {
                    [
                        serviceChangeRecordsResponse,
                        servicesResponse,
                        systemsResponse,
                        groupsResponse,
                    ] = await Promise.all([
                        serviceChangeRecordsPromise,
                        servicesPromise,
                        systemsPromise,
                        groupsPromise,
                    ]);
                } catch (error) {
                    // handles invalid page in url query param on initial load
                    if (error.error.detail) {
                        patchState(store, state => ({
                            isLoading: false,
                            errorMessage: error.error.detail,
                        }));
                        return;
                    }
                    throw error;
                }
                const serviceIdToNameMap = new Map(
                    servicesResponse.map(({ service }) => [service.id, service.displayName]),
                );
                const groupMap = groupPathService.createGroupMap(groupsResponse);
                const systemMap = groupPathService.createSystemMap(systemsResponse);
                const systemToGroupPathMap = groupPathService.createSystemToGroupPathMap(
                    systemsResponse,
                    groupMap,
                );

                // Syncronize API pagination with frontend table pagination
                const { count, results } = serviceChangeRecordsResponse;
                // Create an empty records array with length equal to the total count of records
                const serviceChangeRecords = new Array(count);
                const formattedResults = results.map(
                    ({ changeQuantity, service, date, system }) => ({
                        serviceId: service.id,
                        amount: changeQuantity,
                        changedAtId: system,
                        date,
                    }),
                );
                // Added the paginated API records to the appropriate location in the records array
                // Eg, if we are on API page 2, and the API page size is 100 records, then the frontend records array
                // will be [empty x 100, 100 records from API page 2, empty x array.length-200]
                // This allows the frontend table to properly show/paginated through the total number of records
                serviceChangeRecords.splice(
                    (page - 1) * apiPageSize,
                    formattedResults.length,
                    ...formattedResults,
                );
                patchState(store, state => ({
                    isLoading: false,
                    records: serviceChangeRecords,
                    currentPage: page,
                    serviceIdToNameMap,
                    groupMap,
                    systemMap,
                    systemToGroupPathMap,
                    errorMessage: null,
                }));
            },
        }),
    ),
);
