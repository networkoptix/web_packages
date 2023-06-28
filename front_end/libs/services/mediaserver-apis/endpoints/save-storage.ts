import { Observable } from 'rxjs';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export type SaveStorageParams = {
    typeId: string;
    parentId: string;
    url: string;
    storageType: string;
    spaceLimit?: number;
    usedForWriting: boolean;
    isWritable: boolean;
    isBackup: boolean;
};
export function saveStorageLegacyV1(
    this: MediaserverLegacyConnection,
    data: SaveStorageParams,
): Observable<{ id: string }> {
    return this.post('/ec2/saveStorage', data);
}
