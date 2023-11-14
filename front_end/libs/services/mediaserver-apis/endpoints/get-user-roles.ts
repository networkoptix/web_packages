import { Observable } from 'rxjs';

import { RestUserRole } from '@services/system-api.types/users.types';

import { MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

export function getUserRolesRestV1(this: MediaserverRestConnection): Observable<RestUserRole[]> {
    return this.get('/rest/v1/userRoles');
}
