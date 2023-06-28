import { Observable } from 'rxjs';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

type StorageId = {
    id: string;
};
export function removeStorageLegacyV1(
    this: MediaserverLegacyConnection,
    data: StorageId,
): Observable<StorageId> {
    return this.post('/ec2/removeStorage', data);
}
