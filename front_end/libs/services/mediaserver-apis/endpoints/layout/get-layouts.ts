import { Observable } from 'rxjs';

import { Layouts } from '@services/system-api.types';

import { MediaserverRestConnection } from '../../connections/adapters/adapter-target-types';

export function getLayoutsRestV1(this: MediaserverRestConnection, params: Record<string, unknown> = { _keepDefault: true }): Observable<Layouts> {
    return this.get('/rest/v1/layouts', params);
}
