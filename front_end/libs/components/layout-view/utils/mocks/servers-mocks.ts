import { v4 as uuid } from 'uuid';

import { NxSystemServer } from '@services/system.service/types/servers.types';

export const generateServer = (partialServer: Partial<NxSystemServer> = {}): NxSystemServer => ({
    id: uuid(),
    name: uuid(),
    status: uuid(),
    version: uuid(),
    endpoints: [],
    ip: uuid(),
    osInfo: {
        platform: uuid(),
        variant: uuid(),
        variantVersion: uuid(),
    },
    port: uuid(),
    ...partialServer,
});

export function* generateServers(count: number): Generator<NxSystemServer, void, unknown> {
    for (let i = 0; i < count; i++) {
        yield generateServer();
    }
}
