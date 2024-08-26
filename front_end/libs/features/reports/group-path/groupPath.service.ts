import { Injectable } from '@angular/core';

import {
    CloudSystem,
    GroupStructureItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { GroupMap, SystemMap, SystemToGroupPathMap } from './groupPath.service.types';

@Injectable({
    providedIn: 'root',
})
export class NxGroupPathService {
    createGroupMap(groups: GroupStructureItem[]): GroupMap {
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

    createSystemMap(systems: CloudSystem[]): SystemMap {
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
    createSystemToGroupPathMap(
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

    /**
            Gets a system's group path and converts it to the format [groupPathString, systemName] for the table:  
            rawGroupPath -> formattedGroupPath
            [systemId] -> ['', 'systemName']  
            [parentGroupId, systemId] -> ['parentGroupName', 'systemName']  
            [rootGroupId, parentGroupId, systemId] -> ['rootGroupName / parentGroupName', 'systemName']  
            [rootGroupId, nestedGroupId, parentGroupId, systemId] -> ['rootGroupName / ... / parentGroupName', 'systemName']  
            */
    getFormattedGroupPath(
        systemId: string,
        groupMap: GroupMap,
        systemMap: SystemMap,
        systemToGroupPathMap: SystemToGroupPathMap,
    ): string[] {
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
    }
}
