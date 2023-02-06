
import Dexie, { Table } from 'dexie';

export interface CachedRequest {
    requestArgs: string;
    response: string;
    user: string;
    lastUpdate: number;
}

export class AppDB extends Dexie {
    cachedRequest!: Table<CachedRequest, string>;

    constructor() {
        super('cloudPortalApp');
        this.version(1).stores({
            cachedRequest: '&[requestArgs+user], user, &lastUpdate'
        });
        this.on('populate', () => this.populate());
    }

    async populate(): Promise<void> {
        // TODO: Replicate to remote db
        console.log('Populating database...');
    }
}

export const db = new AppDB();
