import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, switchMap } from 'rxjs';

import { environment } from '@environments/environment';

import { WithFreshSession } from './nx-cloud-api.types';

interface BaseRequestOptions {
    headers?: HttpHeaders | {
        [header: string]: string | string[];
    };
    params?: HttpParams | {
        [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
    };
    body?: unknown;
}

interface PostRequestOptions extends BaseRequestOptions {
    body?: unknown;
}

export type CreateApiFactory<ApiType = unknown> = (http: HttpClient, withFreshSession: WithFreshSession) => (serverUrl: string, cloudHost: string) => ApiType;

/**
 * Static methods required for using BaseCloudServiceAPI abstract class.
 */
export interface CloudServiceAPI {
    API_BASE: string
    createApiFactory: CreateApiFactory
}

/**
 * Base class for connecting to cloud services outside of cloud portal.
 *
 * Handles making request using cloud session.
 *
 * Classes that extend BaseCloudServiceAPI should implement the static properties/methods from CloudServiceAPI.
 */
export abstract class BaseCloudServiceAPI {
    constructor(
        private serverUrl: string,
        private apiBase: string,
        public cloudHost: string,
        private http: HttpClient,
        private withFreshSession: WithFreshSession
    ) {
        if (this.serverUrl.endsWith('/') && this.apiBase.startsWith('/')) {
            this.serverUrl = this.serverUrl.slice(0, -1);
        }
    }

    protected get = <T>(endpoint: string, options?: BaseRequestOptions): Observable<T> => this.#handle<T>(endpoint, (url, { body, ...options }) => this.http.get<T>(url, options), this.#processOptionsFactory(options));

    protected post = <T>(endpoint: string, options?: PostRequestOptions): Observable<T> => this.#handle<T>(endpoint, (url, { body, ...options }) => this.http.post<T>(url, body, options), this.#processOptionsFactory(options));

    protected put = <T>(endpoint: string, options?: PostRequestOptions): Observable<T> => this.#handle<T>(endpoint, (url, { body, ...options }) => this.http.put<T>(url, body, options), this.#processOptionsFactory(options));

    #processOptionsFactory = <T extends BaseRequestOptions>(baseOptions?: T) => (accessToken: string): T | BaseRequestOptions => {
        const options = baseOptions || <BaseRequestOptions>{};
        options.headers ||= new HttpHeaders();

        const additionalHeaders = {
            Authorization: `Bearer ${accessToken}`,
            'cloud-host': this.cloudHost || environment.cloudHostDev
        };

        const updateHeading = ([key, value]: [string, string]): void => {
            if (options.headers instanceof HttpHeaders) {
                options.headers = options.headers.set(key, value);
            } else {
                options.headers[key] = value;
            }
        };

        Object.entries(additionalHeaders).forEach(entry => updateHeading(entry));

        return options;
    };

    #handle<T>(endpoint: string, request: (url: string, options: BaseRequestOptions) => Observable<T>, getOptions: (accessToken: string) => BaseRequestOptions): Observable<T> {
        return this.withFreshSession()(({ accessToken, getFreshAccessToken }) => {
            const url = this.serverUrl + this.apiBase + endpoint;
            return request(
                url, getOptions(accessToken)
            ).pipe(
                // Retry once with fresh token else raise error.
                catchError(() => getFreshAccessToken().pipe(switchMap(accessToken => request(url, getOptions(accessToken))))));
        });
    }

    public verify(password: string): Observable<unknown> {
        return this.http.post('/api/account/verify', {
            password
        });
    }
}
