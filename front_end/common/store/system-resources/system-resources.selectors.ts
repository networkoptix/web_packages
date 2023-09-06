/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { MemoizedSelector, createSelector } from '@ngrx/store';

import { systemResourcesFeature } from './system-resources.feature';
import {
    SystemResourceState,
    SystemResources,
    SystemResourcesTypeMap,
} from './system-resources.types';

export const { selectSystemResourcesState } = systemResourcesFeature;

export const selectResourcesStateBySystemId = (systemId: string) =>
    createSelector(
        selectSystemResourcesState,
        (state): SystemResources => state[systemId] || new SystemResources(),
    );

export const selectResourcesValuesBySystemId = (systemId: string) =>
    createSelector(
        selectResourcesStateBySystemId(systemId),
        (state): SystemResourcesTypeMap =>
            Object.entries(state).reduce(
                (acc, [key, { value }]) => ({ ...acc, [key]: value }),
                {} as SystemResourcesTypeMap,
            ),
    );

const selectByResourceType =
    <T extends SystemResourceState<unknown>['value'] | SystemResourceState<unknown>>(
        extractResourceCallback: (resources: SystemResources) => T,
    ) =>
    (systemId: string) =>
        createSelector(selectResourcesStateBySystemId(systemId), systemResources =>
            extractResourceCallback(systemResources),
        );

export const selectValue =
    <U, T extends { value: U }>(
        selector: (
            systemId: string,
        ) => MemoizedSelector<Record<string, unknown>, T, (s1: unknown) => T>,
    ) =>
    (systemId: string) =>
        createSelector(selector(systemId), (resourceState): T['value'] => resourceState.value);

export const selectByResourceId =
    <T extends { id: string }[]>(
        selector: (
            systemId: string,
        ) => MemoizedSelector<Record<string, unknown>, T, (s1: unknown) => T>,
    ) =>
    (systemId: string, resourceId: string) =>
        createSelector(selector(systemId), (resources): T[number] =>
            resources.find(r => r.id === resourceId),
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
