import { Observable } from 'rxjs';

import { MediaserverRestConnection } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import { Manifest } from '@services/system-api.types/advanced-system-settings';

export function getSystemSettingsManifestLegacy(
    this: MediaserverRestConnection,
    lang?: string,
): Observable<Manifest> {
    throw new Error('should only be using rest v2 version');
}

export function getSystemSettingsManifestV2(
    this: MediaserverRestConnection,
    lang?: string,
): Observable<Manifest> {
    const params: Record<string, string | boolean> = {};
    if (lang) {
        params._language = lang;
    }
    return this.get('/rest/v2/system/settings/*/manifest', { params });
}
