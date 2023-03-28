import { Observable } from 'rxjs';

import { ec2PredefinedRole } from '@services/system-api.types';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export function getPredefinedRolesLegacy(this: MediaserverLegacyConnection): Observable<ec2PredefinedRole[]> {
    return this.get('/ec2/getPredefinedRoles');
}
