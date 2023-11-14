import { Observable } from 'rxjs';

import { Layout } from '@services/system-api.types/layouts.types';

import type {
    MediaserverRestConnection,
    RequestParams,
} from '../../connections/adapters/adapter-target-types';

export function getLayoutRestV1(
    this: MediaserverRestConnection,
    layoutId: string,
    params: RequestParams = { _keepDefault: true },
): Observable<Layout> {
    return this.get(`/rest/v1/layouts/${layoutId}`, { params });
}
