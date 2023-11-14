import { Observable } from 'rxjs';

import { ModuleInformationReply } from '@services/system-api.types/servers.types';

import { MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

export function getServerInfoRestV1(
    this: MediaserverRestConnection,
    serverId: '*',
): Observable<ModuleInformationReply[]>;
export function getServerInfoRestV1(
    this: MediaserverRestConnection,
    serverId: string,
): Observable<ModuleInformationReply>;
export function getServerInfoRestV1(
    this: MediaserverRestConnection,
    serverId: string,
): Observable<unknown> {
    return this.get(`/rest/v1/servers/${serverId}/info`);
}
