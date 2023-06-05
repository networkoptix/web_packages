import { Injectable } from '@angular/core';
import { v4 as uuid } from 'uuid';

import { memoizeAsyncPersistent } from '@utils/memoize';

import { AppDB, generateDbName } from '../db';

import { Account } from './account.service/account';

@Injectable({
    providedIn: 'root',
})
export class NxDbService {
    static shared = AppDB.createDb(generateDbName('shared'));

    // The random DB is just to prevent runtime errors if personal is accessed before it is initialized.
    static personal = AppDB.createDb(`random-${uuid()}`);

    get shared(): typeof NxDbService.shared {
        return NxDbService.shared;
    }

    get personal(): typeof NxDbService.personal {
        return NxDbService.personal;
    }

    updatePersonal(account: Account): ReturnType<typeof AppDB.createDb> {
        const accountId: string = account?.email || account?.id;

        if (!accountId) {
            return NxDbService.personal;
        }

        NxDbService.personal = this.memoizedCreateDb(generateDbName(accountId));
        return NxDbService.personal;
    }

    @memoizeAsyncPersistent
    private memoizedCreateDb(dbName: string): ReturnType<typeof AppDB.createDb> {
        return AppDB.createDb(dbName);
    }
}
