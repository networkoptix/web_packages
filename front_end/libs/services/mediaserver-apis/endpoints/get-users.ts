import { Observable } from 'rxjs';

import type { NxUser } from '@services/system-user.types';

import { MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

export function getUsersRestV1(this: MediaserverRestConnection): Observable<NxUser[]> {
    return this.get('/rest/v1/users', { params: { _keepDefault: true } });
}

export function getUsersRestV3(this: MediaserverRestConnection): Observable<NxUser[]> {
    return this.get('/rest/v3/users', { params: { _keepDefault: true } });
}
