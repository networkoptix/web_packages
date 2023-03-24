import { Observable } from 'rxjs';

import { ec2UserRole } from '@services/system-api.types';

import { MediaserverRestConnection } from '../connections/adapters/adapter-target-types';

export function getUserRolesRestV1(this: MediaserverRestConnection): Observable<ec2UserRole[]> {
    return this.get('/rest/v1/userRoles');
}
