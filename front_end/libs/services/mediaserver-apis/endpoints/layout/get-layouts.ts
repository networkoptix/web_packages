import { Observable } from 'rxjs';

import { Layouts } from '@services/system-api.types';

import type {
    MediaserverRestConnection,
    RequestParams,
} from '../../connections/adapters/adapter-target-types';

export function getLayoutsRestV1(
    this: MediaserverRestConnection,
    params: RequestParams = { _keepDefault: true },
): Observable<Layouts> {
    return this.get('/rest/v1/layouts', { params });
}
