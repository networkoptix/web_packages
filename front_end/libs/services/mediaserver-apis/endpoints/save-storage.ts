import { Observable } from 'rxjs';

import { IParams } from '@services/system.service/system-types';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export function saveStorageLegacyV1<T = { id: string }>(
    this: MediaserverLegacyConnection,
    updateParams: IParams,
): Observable<T> {
    return this.post<T>('/ec2/saveStorage', updateParams, {}, {}, 60000);
}
