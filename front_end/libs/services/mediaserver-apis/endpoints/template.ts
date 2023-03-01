import { Observable } from 'rxjs';

import { MediaserverLegacyConnection, MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

export function templateLegacyV1(this: MediaserverLegacyConnection): Observable<unknown> {
    return this.get('/some/method');
}

export function templateRestV1(this: MediaserverRestConnection): Observable<unknown> {
    return this.get('/some/method');
}
