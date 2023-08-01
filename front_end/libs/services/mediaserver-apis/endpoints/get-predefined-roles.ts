import { Observable } from 'rxjs';

import { PredefinedLegacyRole } from '@services/system-user.types';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export function getPredefinedRolesLegacy(
    this: MediaserverLegacyConnection,
): Observable<PredefinedLegacyRole[]> {
    return this.get('/ec2/getPredefinedRoles');
}
