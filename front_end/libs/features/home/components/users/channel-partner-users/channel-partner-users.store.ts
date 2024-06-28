import { computed, inject, InjectionToken } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
    addEntity,
    removeEntities,
    removeEntity,
    setAllEntities,
    updateEntity,
    withEntities,
} from '@ngrx/signals/entities';

import { alphaNumericSort, caseInsensitiveSearch } from '@utils/general';

import { UserRecord, CPUsersState } from './channel-partner-users.types';

const initialState: CPUsersState = {
    searchQuery: '',
    searchFilters: {},
};

const CP_USER_STATE = new InjectionToken<CPUsersState>('CPUsersState', {
    factory: () => initialState,
});

function getUsersByFilters(
    records: UserRecord[] | undefined,
    filters: Record<string, string>,
): UserRecord[] {
    if (records) {
        return records.filter(user => {
            return (
                (filters.email && caseInsensitiveSearch(user.email, filters.email)) ||
                (filters.name && caseInsensitiveSearch(user.fullName, filters.name)) ||
                (filters.role &&
                    user.roles?.some(role => caseInsensitiveSearch(role, filters.role)))
            );
        });
    }
    return [];
}

function getUsersByModel(records: UserRecord[] | undefined, query: string): UserRecord[] {
    if (records) {
        return records.filter(user => caseInsensitiveSearch(user.email, query));
    }
    return [];
}

export const ChannelPartnerUsersStore = signalStore(
    withState(() => inject(CP_USER_STATE)),
    withEntities<UserRecord>(),
    withMethods(store => ({
        setSearchQuery: search => patchState(store, { searchQuery: search }),
        setSearchFilters: filters => patchState(store, { searchFilters: filters }),
        clearSearchFilters: () => patchState(store, { searchQuery: '', searchFilters: {} }),

        addRecord: (record: UserRecord) =>
            patchState(store, addEntity(record, { idKey: 'userId' })),
        removeRecord: (id: string) => patchState(store, removeEntity(id)),
        removeRecords: (ids: string[]) => patchState(store, removeEntities(ids)),
        updateRecord: (id: string, changes: Partial<UserRecord>) => {
            patchState(store, updateEntity({ id, changes }));
        },
        setRecords: (records: UserRecord[]) =>
            patchState(store, setAllEntities(records, { idKey: 'userId' })),
    })),
    withComputed(
        ({ searchQuery: searchQuery$$, searchFilters: searchFilters$$, entities: entities$$ }) => ({
            filteredRecords$$: computed(() => {
                if (!entities$$().length) {
                    return undefined; // avoid showing "No data" msg.
                }

                const records = entities$$().sort(alphaNumericSort(record => record.email));
                const search = searchQuery$$();
                const filters = searchFilters$$() as Record<string, string>;
                let filteredRecords: UserRecord[] = records;

                if (Object.keys(filters).length) {
                    filteredRecords = getUsersByFilters(filteredRecords, filters);
                }
                if (search.length) {
                    filteredRecords = getUsersByModel(records, search);
                }

                return filteredRecords;
            }),
        }),
    ),
);
