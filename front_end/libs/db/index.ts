import { dexieRxjs } from '@pvermeer/dexie-rxjs-addon';
import Dexie from 'dexie';
import { applyEncryptionMiddleware, clearAllTables, NON_INDEXED_FIELDS } from 'dexie-encrypted';
import { chunk, zip } from 'lodash-es';
import md5 from 'md5';
import stringify from 'safe-stable-stringify';

import { getUser } from '@utils/user';

// Alias the table definitions to make it easier to import them.
import { definition as cachedRequest } from './models/cached-request';
import { definition as example } from './models/example';
import { definition as menuContent } from './models/menu-content';
import { definition as systems } from './models/systems';
import { definition as unstructured } from './models/unstructured';

// When adding a model, the definition should be imported here.
// Currently we're mapping table defs seperately because of type issues but we should update to map from definitions in the future.
const definitions = [example, cachedRequest, systems, menuContent, unstructured];

// TODO: Figure out how to type this when mapping from a list of objects instead of hard coded like this.
const tableDefs = {
    ...cachedRequest.tableDef,
    ...example.tableDef,
    ...systems.tableDef,
    ...menuContent.tableDef,
    ...unstructured.tableDef,
} as const;

const schemas = definitions.map(({ schema }) => schema);

const obscure = (segments: string[]): string => {
    const obscuredSegments = segments.map(val =>
        [btoa, btoa, btoa, btoa, md5].reduce((acc, fn) => fn(acc), val),
    );
    const chunked = obscuredSegments.map(segment => chunk(segment.split(''), 8));
    const zipped = zip(...chunked).flat(2);
    const to32 = zipped.filter((_, index) => index % 3 === 0);
    return to32.join('');
};

const generateKey = (dbName: string): Uint8Array => {
    /**
     * Not sure if we'll need to to invalidate DB keys when the app version changes.
     *
     * If we do, then using envsubst on this file to replace $VERSION with the app version should work.
     */
    const keyString = obscure([dbName, location.origin, '$VERSION']);
    return new TextEncoder().encode(keyString);
};

export const generateDbName = (dbName?: string): string => {
    const segments = [dbName || getUser(), stringify(definitions), '$VERSION'];
    return obscure(segments);
};

// The code the AppDB class shouldn't contain any references to the table definitions.
// If we need additional abstraction for things like migrating models we should do that in the table definition files.
// We would add wrappers here to call those functions.
export class AppDB extends Dexie {
    static createDb(dbName: string): AppDB & typeof tableDefs {
        // Delete randomly generate DBs. Used to make sure a personal instance is created before accessing it.
        Dexie.getDatabaseNames().then(names => {
            const randomDbNames = names.filter(name => name.includes('random') && name !== dbName);
            randomDbNames.forEach(name => Dexie.delete(name));
        });

        return new AppDB(dbName) as AppDB & typeof tableDefs;
    }
    constructor(dbName: string) {
        super(dbName, {
            addons: [dexieRxjs],
        });
        if (process.env.JEST_WORKER_ID === undefined) {
            applyEncryptionMiddleware(
                this,
                generateKey(dbName),
                Object.keys(tableDefs).reduce(
                    (acc, key) => ({ ...acc, [key]: NON_INDEXED_FIELDS }),
                    {},
                ),
                clearAllTables,
            );
        }
        // TODO: Currently we're keeping the version 1. If the schema changes we create new Db's.
        // If we ever add remote sync we'll need to add migration handlers and properly version.
        this.version(1).stores(Object.assign({}, ...schemas));
        this.on('populate', () => this.populate());
    }

    async populate(): Promise<void> {
        // TODO: Replicate to remote db
        // console.log('Populating database...');
    }
}
