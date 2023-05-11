import { Observable } from 'rxjs';

import { MediaserverRestConnection } from '../../connections/adapters/adapter-target-types';

export function deleteLayoutRestV1(
    this: MediaserverRestConnection,
    layoutId: string,
): Observable<unknown> {
    return this.delete(`/rest/v1/layouts/${layoutId}`);
}
