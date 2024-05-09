import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { patchState } from '@ngrx/signals';
import { setEntities } from '@ngrx/signals/entities';
import { StoreModule } from '@ngrx/store';
import { random, sample } from 'lodash-es';
import { of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    CloudSystem,
    CloudSystemLight,
    Group,
    GroupItem,
    GroupStructureItem,
    PatchGroup,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemsService } from '@services/systems.service';
import { channelPartnersReducer } from '@store/channel-partners/channel-partners.reducer';

import { setupComponent } from '../../../../src/setup';
import { findItem, flattenGroups } from '../groups-utils';
import { GroupsStore } from '../groups.store';
import { GroupFlatItem, SystemsByOrgOrGroup } from '../groups.types';

export { uuid, sample, findItem, flattenGroups };

export const generateIds = (min = 2, max = 10): string[] =>
    Array(random(min, max, false))
        .fill(undefined)
        .map(() => uuid());

export const generateGroups = (
    min = 5,
    max = 10,
): { flatGroups: GroupFlatItem[]; groups: GroupItem[] } => {
    const flatGroups = generateIds(min, max).map((id, index, arr) => ({
        id,
        name: uuid(),
        parentId: !index ? null : arr[index - 1],
        systemCount: 0,
        children: arr[index + 1] ? [arr[index + 1]] : [],
    }));
    const groups: GroupItem[] = flatGroups.map(group => ({ ...group, children: [] }) as GroupItem);

    while (groups.length > 1) {
        const group = groups.pop()!;
        const parent = groups[groups.length - 1];
        parent.children.push(group);
    }
    return { flatGroups, groups };
};

export function generateSystemsByOrgOrGroup(groups: GroupFlatItem[]): SystemsByOrgOrGroup[];
export function generateSystemsByOrgOrGroup(min?: number, max?: number): SystemsByOrgOrGroup[];
export function generateSystemsByOrgOrGroup(
    minOrGroups: number | GroupFlatItem[] = 5,
    max = 10,
): SystemsByOrgOrGroup[] {
    const groupsProvided = Array.isArray(minOrGroups);
    const groupOrOrgIds = groupsProvided
        ? minOrGroups
              .sort(({ parentId: a }, { parentId: b }) => (a || '').localeCompare(b || ''))
              .map(({ id }) => id)
        : generateIds(minOrGroups, max);
    const organization = groupOrOrgIds[0];
    return groupOrOrgIds.map((id, orgIndex) => {
        const cloudSystems = Array(random(5, 10))
            .fill(undefined)
            .map((_, systemIndex) => ({
                activated: true,
                created: uuid(),
                systemId: uuid(),
                organization,
                groupId: organization === id ? null : id,
                organizationName: organization,
                system_state: 'active',
                state: 'active',
                effectiveState: 'active',
                id: orgIndex * max ** 2 + systemIndex,
                name: null as never,
            }));
        const systems = cloudSystems.map(({ systemId }) => systemId);
        return {
            id,
            systems,
            cloudSystems,
        };
    });
}

export const generateGroupsAndSystems = (
    min = 5,
    max = 10,
): {
    flatGroups: GroupFlatItem[];
    groups: GroupItem[];
    systemsByOrgOrGroup: SystemsByOrgOrGroup[];
    organizationId: string;
} => {
    const { flatGroups, groups } = generateGroups(min, max);
    const systemsByOrgOrGroup = generateSystemsByOrgOrGroup(flatGroups);
    const organizationId = flatGroups[0].id;
    return { flatGroups, groups, systemsByOrgOrGroup, organizationId };
};

class MockParamStateHandler {
    state$$ = signal({ params: {}, queryParams: {} });
    state$ = toObservable(this.state$$);
}

export const generateGroup = ({
    id = '',
    parentId = null,
    organizationId = '',
    children = [],
    name = '',
    systemCount = 0,
    path = [],
    systems = [],
    cloudSystems = [],
}: Partial<Group> = {}): Group => ({
    id,
    parentId,
    organizationId,
    children,
    name,
    systemCount,
    path,
    systems,
    cloudSystems,
});

class CpServiceMock
    implements
        Pick<
            NxChannelPartnersService,
            | 'paramStateHandler'
            | 'getGroupsStructure'
            | 'getGroup'
            | 'getUserSystems'
            | 'patchGroup'
            | 'updateSystemGroup'
        >
{
    paramStateHandler =
        new MockParamStateHandler() as NxChannelPartnersService['paramStateHandler'];
    getGroupsStructure = jest.fn((_orgId: string) => of([] as GroupStructureItem[]));
    getGroup = jest.fn((id: string) => of(generateGroup({ id })));
    getUserSystems = jest.fn((id: string, _rootOnly?: boolean) => of([] as CloudSystemLight[]));
    patchGroup = jest.fn((id: string, body: PatchGroup) => of(generateGroup({ id, ...body })));
    updateSystemGroup = jest.fn((systemId: string, body: { groupId: string | number | null }) =>
        of({ id: uuid(), systemId, ...body } as unknown as CloudSystem),
    );
}

@Injectable({
    providedIn: 'root',
})
class StoreWrapper {
    public cpService = inject(NxChannelPartnersService) as unknown as CpServiceMock;
    public systemsService = inject(NxSystemsService);
    public groupsStore = inject(GroupsStore);
}

export const populateStore = (
    groupsStore: StoreWrapper['groupsStore'],
): ReturnType<typeof generateGroupsAndSystems> => {
    const generated = generateGroupsAndSystems();

    patchState(
        groupsStore,
        setEntities(generated.groups, { collection: 'groups' }),
        setEntities(generated.systemsByOrgOrGroup, { collection: 'systems' }),
    );

    return generated;
};

export const setupGroupsStore = async (): Promise<
    StoreWrapper & {
        detectChanges: () => void;
    }
> => {
    const { inject, detectChanges } = await setupComponent(
        undefined,
        undefined,
        [StoreModule.forFeature('channelPartners', channelPartnersReducer)],
        [
            {
                provide: NxChannelPartnersService,
                useClass: CpServiceMock,
            },
        ],
    );

    const storeWrapper = await inject(StoreWrapper);

    return {
        ...storeWrapper,
        detectChanges,
    };
};
