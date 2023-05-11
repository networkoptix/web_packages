import { Observable } from 'rxjs';

import { Layout } from '@services/system-api.types';

import { MediaserverRestConnection } from '../../connections/adapters/adapter-target-types';

export function putLayoutRestV1(
    this: MediaserverRestConnection,
    layoutId: string,
    data: Partial<Layout>,
): Observable<Layout> {
    return this.put(`/rest/v1/layouts/${layoutId}`, data);
}
