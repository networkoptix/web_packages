import { Observable } from 'rxjs';

import { restUser } from '@services/system-api.types';
import { NxSystemUser } from '@services/system.service/user-manager/user-manager-types.bak';

import { MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

export function getUsersRestV1(this: MediaserverRestConnection): Observable<restUser[]> {
    return this.get('/rest/v1/users');
}

export function getUsersRestV3(this: MediaserverRestConnection): Observable<NxSystemUser[]> {
    return this.get('/rest/v3/users?_keepDefault=true');
}
