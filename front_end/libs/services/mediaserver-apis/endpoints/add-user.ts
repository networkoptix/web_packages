import { Observable } from 'rxjs';

import { ChangedIdReturned } from '@services/system-api.types';
import { BaseNewUser, RestNewUser } from '@services/system-user.types';

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
