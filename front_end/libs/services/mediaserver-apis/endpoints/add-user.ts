import { Observable } from 'rxjs';

import { ChangedIdReturned } from '@services/system-api.types';
import { NxSystemUser } from '@services/system.service/user-manager/user-manager-types.bak';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';
import { cleanUserObjectRest } from '../utils/clean-user-object';

export function addUserRestV2(this: MediaserverLegacyConnection, user: NxSystemUser): Observable<ChangedIdReturned> {
    user.type = user.isCloud ? 'cloud' : 'local'; // TODO: add LDAP
    user.isHttpDigestEnabled = !user.isCloud;

    return this.post<ChangedIdReturned>(
        '/rest/v1/users',
        cleanUserObjectRest(user)
    );
}
