import { Observable } from 'rxjs';

import { ModuleInformationReply } from '@services/system-api.types';

import { MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

import { proxyLegacyV1 } from './proxy';

export function getServerInfoRestV1(
    this: MediaserverRestConnection,
    remoteEndpoint: string,
): Observable<ModuleInformationReply> {
    remoteEndpoint = remoteEndpoint.replace(/https?:\/\/(?:.*@)?/, '');
    return proxyLegacyV1('get', 'https', remoteEndpoint, 'rest/v1/servers/this/info', {});
}
