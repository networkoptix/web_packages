import { Observable } from 'rxjs';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export function getNonceLegacyV1(
    this: MediaserverLegacyConnection,
    login: string,
    url?: string,
): Observable<unknown> {
    const params: Record<string, string> = {
        userName: login,
    };
    if (url) {
        if (!url.includes('http')) {
            url = 'http://' + url;
        }
        params.url = url;
    }
    const nonceType = url ? 'getRemoteNonce' : 'getNonce';
    return this.get(`/api/${nonceType}`, params);
}
