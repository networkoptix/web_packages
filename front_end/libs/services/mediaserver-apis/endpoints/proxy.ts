import { Observable, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

export function proxyLegacyV1<ResponseType = unknown>(
    this: MediaserverLegacyConnection,
    method: string,
    protocol: string,
    serverAddress: string,
    requestUrl: string,
    data: Record<string, unknown>,
    coercedEnglishError?: boolean,
): Observable<ResponseType> {
    if (environment.isLocal && protocol === 'https') {
        protocol = 'https-insecure';
    }
    const url = `/proxy/${protocol}/${serverAddress}/${requestUrl}`;

    const headers: Record<string, unknown> = {};
    if (coercedEnglishError) {
        headers['Accept-Language'] = 'en-US';
    }
    if (method === 'get') {
        return this.get(url, data, headers);
    } else if (method === 'post') {
        return this.post(url, data, headers);
    }
    throwError(new Error('Invalid http method type was passed.'));
}
