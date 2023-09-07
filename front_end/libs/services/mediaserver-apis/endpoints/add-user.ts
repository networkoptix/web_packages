import { Observable } from 'rxjs';

import { ChangedIdReturned, RestV3SaveUser } from '@services/system-api.types';
import { AddUser, BaseNewUser, RestNewUser } from '@services/system-user.types';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';
import { cleanUserObjectRest } from '../utils/clean-user-object';

export function addUserRestV1(
    this: MediaserverLegacyConnection,
    user: BaseNewUser,
): Observable<ChangedIdReturned> {
    const userData: RestNewUser = {
        ...user,
        type: user.isCloud ? 'cloud' : 'local',
        isHttpDigestEnabled: !user.isCloud,
    };

    return this.post<ChangedIdReturned>('/rest/v1/users', cleanUserObjectRest(userData));
}

export function addUserRestV3(
    this: MediaserverLegacyConnection,
    user: AddUser,
): Observable<ChangedIdReturned> {
    const userData: RestV3SaveUser = {
        ...user,
        type: user.isCloud ? 'cloud' : 'local',
        isHttpDigestEnabled: !user.isCloud,
    };

    return this.post<ChangedIdReturned>('/rest/v3/users', userData);
}
