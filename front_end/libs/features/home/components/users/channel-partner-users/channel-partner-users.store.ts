import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import {
    addEntity,
    removeEntities,
    removeEntity,
    setAllEntities,
    updateEntity,
    withEntities,
} from '@ngrx/signals/entities';

import { caseInsenstiveSearch } from '@utils/general';
import { paramSignal } from '@utils/signals';

import { UserRecord } from './channel-partner-users.types';

function getUsersByModel(records: UserRecord[] | undefined, query: string): UserRecord[] {
    if (records) {
        return records.filter(user => caseInsenstiveSearch(user.email, query));
    }
    return [];
}

export const ChannelPartnerUsersStore = signalStore(
    withEntities<UserRecord>(),
    withMethods(store => ({
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
    withComputed(({ entities: entities$$ }, searchQuery$$ = paramSignal('search')) => ({
        filteredRecords$$: computed(() => {
            const records = entities$$();
            const search = searchQuery$$();
            if (!records) {
                return undefined; // avoid showing "No data" msg.
            } else if (search.length) {
                return getUsersByModel(records, search);
            } else {
                return records;
            }
        }),
    })),
);
