import { Observable, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import {
    MediaserverLegacyConnection,
    RequestParams,
} from '../connections/adapters/adapter-target-types';

export function proxyLegacyV1<T>(
    this: MediaserverLegacyConnection,
    method: string,
    protocol: string,
    serverAddress: string,
    requestUrl: string,
    data: RequestParams,
    coercedEnglishError?: boolean,
): Observable<T> {
    if (environment.isLocal && protocol === 'https') {
        protocol = 'https-insecure';
    }
    const url = `/proxy/${protocol}/${serverAddress}/${requestUrl}`;

    const headers: Record<string, string> = {};
    if (coercedEnglishError) {
        headers['Accept-Language'] = 'en-US';
    }
    if (method === 'get') {
        return this.get(url, { params: data, customHeaders: headers });
    } else if (method === 'post') {
        return this.post(url, data, headers);
    }
    throwError(new Error('Invalid http method type was passed.'));
}
