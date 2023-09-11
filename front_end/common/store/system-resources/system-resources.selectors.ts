/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { MemoizedSelector, createSelector } from '@ngrx/store';
import { memoize } from 'lodash-es';

import { systemResourcesFeature } from './system-resources.feature';
import {
    SystemResourceState,
    SystemResources,
    SystemResourcesTypeMap,
} from './system-resources.types';

export const { selectSystemResourcesState } = systemResourcesFeature;

export const selectResourcesStateBySystemId = memoize((systemId: string) =>
    createSelector(
        selectSystemResourcesState,
        (state): SystemResources => state[systemId] || new SystemResources(),
    ),
);

export const selectResourcesValuesBySystemId = memoize((systemId: string) =>
    createSelector(
        selectResourcesStateBySystemId(systemId),
        (state): SystemResourcesTypeMap =>
            Object.entries(state).reduce(
                (acc, [key, { value }]) => ({ ...acc, [key]: value }),
                {} as SystemResourcesTypeMap,
            ),
    ),
);

const selectByResourceType = memoize(
    <T extends SystemResourceState<unknown>['value'] | SystemResourceState<unknown>>(
        extractResourceCallback: (resources: SystemResources) => T,
    ) =>
        memoize((systemId: string) =>
            createSelector(selectResourcesStateBySystemId(systemId), systemResources =>
                extractResourceCallback(systemResources),
            ),
        ),
);

export const selectValue = memoize(
    <U, T extends { value: U }>(
        selector: (
            systemId: string,
        ) => MemoizedSelector<Record<string, unknown>, T, (s1: unknown) => T>,
    ) =>
        memoize((systemId: string) =>
            createSelector(selector(systemId), (resourceState): T['value'] => resourceState.value),
        ),
);

export const selectByResourceId = memoize(
    <T extends { id: string }[]>(
        selector: (
            systemId: string,
        ) => MemoizedSelector<Record<string, unknown>, T, (s1: unknown) => T>,
    ) =>
        memoize(
            (systemId: string, resourceId: string) =>
                createSelector(selector(systemId), (resources): T[number] =>
                    resources.find(r => r.id === resourceId),
                ),
            (...args) => args.join('-'),
        ),
);

export const selectCamerasStateBySystemId = selectByResourceType(({ cameras }) => cameras);

export const selectServersStateBySystemId = selectByResourceType(({ servers }) => servers);

export const selectLayoutsStateBySystemId = selectByResourceType(({ layouts }) => layouts);

export const selectWebpagesStateBySystemId = selectByResourceType(({ webPages }) => webPages);

export const selectCamerasBySystemId = selectValue(selectCamerasStateBySystemId);

export const selectServersBySystemId = selectValue(selectServersStateBySystemId);

export const selectLayoutsBySystemId = selectValue(selectLayoutsStateBySystemId);

export const selectWebpagesBySystemId = selectValue(selectWebpagesStateBySystemId);

export const selectCameraById = selectByResourceId(selectCamerasBySystemId);

export const selectServerById = selectByResourceId(selectServersBySystemId);

export const selectLayoutById = selectByResourceId(selectLayoutsBySystemId);

export const selectWebpageById = selectByResourceId(selectWebpagesBySystemId);
