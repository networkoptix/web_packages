import { Table } from 'dexie';

import { NxSystemInfo } from '@services/systems.service.types';

// This is the type signature for the table itself. Accepts the interface and the primary key type.
type TableDef = Table<NxSystemInfo, string>;

// This is the key for the table and should be unique.
export const key = 'systems';

// This is the index definitions for the table. The first defines the primary key, the rest are other indexes.
const indexDef = 'id, name, stateOfHealth, ownerAccountEmail, currentDexieUser';

// ****** Don't change the part below. It's used to provide type safety for the table definitions. ******

const tableDef = {
    [key as typeof key]: null as TableDef,
};

const schema = {
    [key]: indexDef,
};

// this is the definition that will be used in the db/index.ts file
// Currently we're definiting the tables and schema, eventually we'll add things like migration handlers.
export const definition = {
    tableDef,
    schema,
};
