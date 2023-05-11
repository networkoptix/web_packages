import { Observable } from 'rxjs';

import { Layout } from '@services/system-api.types';

import { MediaserverRestConnection } from '../../connections/adapters/adapter-target-types';

export function getLayoutRestV1(
    this: MediaserverRestConnection,
    layoutId: string,
    params: Record<string, unknown> = { _keepDefault: true },
): Observable<Layout> {
    return this.get(`/rest/v1/layouts/${layoutId}`, params);
}
