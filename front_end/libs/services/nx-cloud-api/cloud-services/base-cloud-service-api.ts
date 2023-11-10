import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, Observable, switchMap } from 'rxjs';

import { environment } from '@environments/environment';
import { staticImplements } from '@utils/general';
import { InterceptorManager } from '@utils/interceptor-manager';
import { startWithCache } from '@utils/start-with-cached';

import { WithFreshSession } from '../nx-cloud-api.types';

interface BaseRequestOptions {
    headers?:
        | HttpHeaders
        | {
              [header: string]: string | string[];
          };
    params?:
        | HttpParams
        | {
              [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
          };
    body?: unknown;
}

interface PostRequestOptions extends BaseRequestOptions {}

export type CreateApiFactory<ApiType = unknown> = (
    http: HttpClient,
    withFreshSession: WithFreshSession,
    refreshToken?: Observable<string>,
) => (serverUrl?: string, cloudHost?: () => string) => ApiType;

/**
 * Static properties methods required for using BaseCloudServiceAPI abstract class.
 */
interface CloudServiceAPI {
    API_BASE: string;
    createApiFactory: CreateApiFactory;
    INSTANCES: Record<string, unknown>;
}

/**
 * Decorator to ensure that cloud services extended from the abstract BaseCloudServiceAPI have the correct static properties and methods.
 */
export const implementsCloudServiceApi = staticImplements<CloudServiceAPI>();

/**
 * Decorator to mark method as disabled.
 */
export function disabledMethod(
    target: unknown,
    name: string,
    descriptor: PropertyDescriptor,
): void {
    descriptor.value = function () {
        throw new Error('This method is not currently enabled');
    };
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
        protected serverUrl: string,
        private apiBase: string,
        public hostOrCustomization: () => string,
        protected http: HttpClient,
        private withFreshSession: WithFreshSession,
    ) {
        if (this.serverUrl.endsWith('/') && this.apiBase.startsWith('/')) {
            this.serverUrl = this.serverUrl.slice(0, -1);
        }

        this.hostOrCustomization ||= () => environment.cloudHost || window.location.hostname;
    }

    public get = <T>(endpoint: string, options?: BaseRequestOptions): Observable<T> =>
        this.#handle<T>(
            endpoint,
            (url, { body, ...options }) =>
                this.http.get<T>(url, options).pipe(startWithCache(url, options)),
            this.#processOptionsFactory(options),
        );

    public post = <T>(endpoint: string, options?: PostRequestOptions): Observable<T> =>
        this.#handle<T>(
            endpoint,
            (url, { body, ...options }) => this.http.post<T>(url, body, options),
            this.#processOptionsFactory(options),
        );

    public patch = <T>(endpoint: string, options?: PostRequestOptions): Observable<T> =>
        this.#handle<T>(
            endpoint,
            (url, { body, ...options }) => this.http.patch<T>(url, body, options),
            this.#processOptionsFactory(options),
        );

    public put = <T>(endpoint: string, options?: PostRequestOptions): Observable<T> =>
        this.#handle<T>(
            endpoint,
            (url, { body, ...options }) => this.http.put<T>(url, body, options),
            this.#processOptionsFactory(options),
        );

    public delete = <T>(endpoint: string, options?: PostRequestOptions): Observable<T> =>
        this.#handle<T>(
            endpoint,
            (url, { body, ...options }) => this.http.delete<T>(url, { ...options, body }),
            this.#processOptionsFactory(options),
        );

    #processOptionsFactory =
        <T extends BaseRequestOptions>(baseOptions?: T) =>
        (accessToken: string): T | BaseRequestOptions => {
            const options = baseOptions || <BaseRequestOptions>{};
            options.headers ||= new HttpHeaders();

            const additionalHeaders = {
                Authorization: `Bearer ${accessToken}`,
                'cloud-host':
                    this.hostOrCustomization() ||
                    environment.cloudHostDev ||
                    environment.cloudHost ||
                    '',
            };
            if (!accessToken) {
                throw Error('Access token is missing');
            }

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

    #handle<T>(
        endpoint: string,
        request: (url: string, options: BaseRequestOptions) => Observable<T>,
        getOptions: (accessToken: string) => BaseRequestOptions,
    ): Observable<T> {
        const url = this.serverUrl + this.apiBase + endpoint;
        if (InterceptorManager.enabled) {
            return request(url, getOptions(InterceptorManager.USE_CLOUD_TOKEN));
        }

        return this.withFreshSession()(({ accessToken, getFreshAccessToken }) => {
            return request(url, getOptions(accessToken)).pipe(
                // Retry once with fresh token else raise error.
                catchError(() =>
                    getFreshAccessToken().pipe(
                        switchMap(accessToken => request(url, getOptions(accessToken))),
                    ),
                ),
            );
        });
    }

    public verify(password: string): Observable<unknown> {
        return this.http.post('/api/account/verify', {
            password,
        });
    }
}
