import { DBConfig } from 'ngx-indexed-db';

export const dbConfig: DBConfig = {
    name: 'genericUnencryptedCache',
    version: 3,
    objectStoresMeta: [
        {
            store: 'requestCache',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [{ name: 'value', keypath: 'value', options: { unique: false } }],
        },
        {
            store: 'menuCache',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [{ name: 'value', keypath: 'value', options: { unique: false } }],
        },
        {
            store: 'layoutCache',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [{ name: 'value', keypath: 'value', options: { unique: false } }],
        },
        {
            store: 'jsons',
            storeConfig: { keyPath: 'key', autoIncrement: false },
            storeSchema: [
                { name: 'json', keypath: 'json', options: { unique: false } },
                { name: 'markdown', keypath: 'markdown', options: { unique: false } },
                { name: 'version', keypath: 'version', options: { unique: false } },
            ],
        },
    ],
};
