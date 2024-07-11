import {
    CloudSystem,
    GroupStructureItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { apiPageSize } from './service-changes.store';
import { GroupMap, SystemMap, SystemToGroupPathMap } from './service-changes.types';

export function createGroupMap(groups: GroupStructureItem[]): GroupMap {
    const groupMap: GroupMap = new Map();

    function populateGroupMap(groups: GroupStructureItem[]): void {
        for (const group of groups) {
            groupMap.set(group.id, group);
            if (group.children) {
                populateGroupMap(group.children);
            }
        }
    }
    populateGroupMap(groups);

    return groupMap;
}

export function createSystemMap(systems: CloudSystem[]): SystemMap {
    const systemMap: SystemMap = new Map();
    for (const system of systems) {
        systemMap.set(system.systemId, system);
    }
    return systemMap;
}

/**
A group path is an array of a system's parent groups, ending with the system itself. For instance:  
[rootGroupId, parentGroupId, systemGroupId]  
 */
export function createSystemToGroupPathMap(
    systems: CloudSystem[],
    groupMap: Map<string, GroupStructureItem>,
): SystemToGroupPathMap {
    const systemToGroupPathMap: SystemToGroupPathMap = new Map();

    for (const system of systems) {
        const groupPath: string[] = [];

        if (system.groupId) {
            let currentGroup = groupMap.get(system.groupId);
            while (currentGroup?.parentId) {
                groupPath.unshift(currentGroup.id);
                currentGroup = groupMap.get(currentGroup.parentId);
            }
            if (currentGroup) {
                groupPath.unshift(currentGroup.id);
            }
        }

        groupPath.push(system.systemId);
        systemToGroupPathMap.set(system.systemId, groupPath);
    }

    return systemToGroupPathMap;
}

function getPageRange(page: number, pageSize: number): { min: number; max: number } {
    return {
        min: page * pageSize - (pageSize - 1),
        max: page * pageSize,
    };
}

export function isTablePageOutsideLoadedApiPage(
    tablePage: number,
    tablePageSize: number,
    apiPage: number,
): boolean {
    const tableRange = getPageRange(tablePage, tablePageSize);
    const apiRange = getPageRange(apiPage, apiPageSize);
    if (tableRange.min < apiRange.min || tableRange.max > apiRange.max) {
        return true;
    } else {
        return false;
    }
}

export function getNextApiPage(tablePage: number, tablePageSize: number, apiPage: number): number {
    const tableRange = getPageRange(tablePage, tablePageSize);
    const apiRange = getPageRange(apiPage, apiPageSize);
    if (tableRange.min < apiRange.min || tableRange.max > apiRange.max) {
        return Math.ceil(tableRange.min / apiPageSize);
    } else {
        return apiPage;
    }
}
