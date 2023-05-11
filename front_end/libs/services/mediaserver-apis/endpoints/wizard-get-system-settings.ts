import { Observable } from 'rxjs';

import { SettingsConfig } from '@services/nx-config/base-config';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export function wizardGetSystemSettingsRestV2(
    this: MediaserverLegacyConnection,
): Observable<SettingsConfig> {
    return this.get('/rest/v2/system/settings?_keepDefault');
}
