import { Observable } from 'rxjs';

import { Layout } from '@services/system-api.types';

import { MediaserverRestConnection } from '../../connections/adapters/adapter-target-types';

export function createLayoutRestV1(this: MediaserverRestConnection, data: Omit<Layout, 'id' | 'systemId'>): Observable<Layout> {
    return this.post('/rest/v1/layouts/', data);
}
