import { Table } from 'dexie';

export interface CachedRequest {
    requestArgs: string;
    response: unknown;
    lastUpdate: number;
}

type TableDef = Table<CachedRequest, string>;

const key = 'cachedRequest';

const indexDef = 'requestArgs, &lastUpdate';

// Don't change this part. It's used to provide type safety for the table definitions.

const tableDef = {
    [key as typeof key]!: null as TableDef
};

const schema = {
    [key]: indexDef
};

export const definition = {
    tableDef,
    schema
};
