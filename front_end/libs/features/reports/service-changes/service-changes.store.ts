import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';

import { NxChannelPartnersService } from '@services/channel-partners.service';

import {
    GroupMap,
    ServiceChangeRecord,
    SystemMap,
    SystemToGroupPathMap,
} from './service-changes.types';
import {
    createGroupMap,
    createSystemMap,
    createSystemToGroupPathMap,
} from './service-changes.utils';

interface ServiceChangesState {
    isLoading: boolean;
    records: ServiceChangeRecord[];
    serviceIdToNameMap: Map<string, string>;
    groupMap: GroupMap;
    systemMap: SystemMap;
    systemToGroupPathMap: SystemToGroupPathMap;
}

const initialState: ServiceChangesState = {
    isLoading: true,
    records: [],
    serviceIdToNameMap: new Map(),
    groupMap: new Map(),
    systemMap: new Map(),
    systemToGroupPathMap: new Map(),
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
                const systemsPromise = firstValueFrom(CPService.getOrgSystems(entityId));
                const groupsPromise = firstValueFrom(CPService.getGroupsStructure(entityId));
                const [
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
                const serviceIdToNameMap = new Map(
                    servicesResponse.map(({ service }) => [service.id, service.displayName]),
                );
                const groupMap = createGroupMap(groupsResponse);
                const systemMap = createSystemMap(systemsResponse);
                const systemToGroupPathMap = createSystemToGroupPathMap(systemsResponse, groupMap);
                const serviceChangeRecords = serviceChangeRecordsResponse.results.map(
                    ({ changeQuantity, service, date, system }) => ({
                        serviceId: service.id,
                        amount: changeQuantity,
                        changedAtId: system,
                        date,
                    }),
                );
                patchState(store, {
                    isLoading: false,
                    records: serviceChangeRecords,
                    serviceIdToNameMap,
                    groupMap,
                    systemMap,
                    systemToGroupPathMap,
                });
            },
            /**
            Gets a system's group path and converts it to the format [groupPathString, systemName] for the table:  
            rawGroupPath -> formattedGroupPath
            [systemId] -> ['', 'systemName']  
            [parentGroupId, systemId] -> ['parentGroupName', 'systemName']  
            [rootGroupId, parentGroupId, systemId] -> ['rootGroupName / parentGroupName', 'systemName']  
            [rootGroupId, nestedGroupId, parentGroupId, systemId] -> ['rootGroupName / ... / parentGroupName', 'systemName']  
            */
            getFormattedGroupPath(systemId: string): string[] {
                const {
                    groupMap: groupMap$$,
                    systemMap: systemMap$$,
                    systemToGroupPathMap: systemToGroupPathMap$$,
                } = store;
                const groupMap = groupMap$$();
                const systemMap = systemMap$$();
                const systemToGroupPathMap = systemToGroupPathMap$$();

                const groupPath = systemToGroupPathMap.get(systemId) ?? [];
                // It's possible for a system to have been removed from an org, but to still be in the service change records.
                // In that case we don't have any info for the system other than its ID, so we'll show that
                const systemName = systemMap.get(systemId)?.name ?? systemId;
                const formattedGroupPath: string[] = [systemName];
                if (groupPath.length === 1) {
                    formattedGroupPath.unshift('');
                } else if (groupPath.length === 2) {
                    const groupName = groupMap.get(groupPath[0])!.name;
                    formattedGroupPath.unshift(`${groupName} /`);
                } else if (groupPath.length === 3) {
                    const rootGroupName = groupMap.get(groupPath[0])!.name;
                    const nestedGroupName = groupMap.get(groupPath[1])!.name;
                    const groupPathString = `${rootGroupName} / ${nestedGroupName} /`;
                    formattedGroupPath.unshift(groupPathString);
                } else if (groupPath.length >= 4) {
                    const rootGroupName = groupMap.get(groupPath[0])!.name;
                    const parentGroupName = groupMap.get(groupPath[groupPath.length - 2])!.name;
                    const groupPathString = `${rootGroupName} / ... / ${parentGroupName} /`;
                    formattedGroupPath.unshift(groupPathString);
                }
                return formattedGroupPath;
            },
        }),
    ),
);
