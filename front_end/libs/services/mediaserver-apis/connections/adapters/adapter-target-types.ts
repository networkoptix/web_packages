import type { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RequestParams = Exclude<Parameters<HttpClient['get']>[1]['params'], HttpParams>;
// Exclude HttpParams for now since params used are all objects

type ResponseTypes = 'arraybuffer' | 'blob' | 'text' | 'json';

export interface RequestOpts {
    params?: RequestParams;
    customHeaders?: Record<string, string>;
    responseType?: ResponseTypes;
    requestTimeout?: number;
}

export interface WithOptionalJson extends RequestOpts {
    responseType?: 'json';
}

export interface WithResponseType<RT extends ResponseTypes> extends RequestOpts {
    responseType: RT;
}

/**
 * Defines our current api connection methods. This is used to move the endpoint definitions out of the classes.
 */
export abstract class MediaserverBaseConnection {
    protected readonly notImplementedMsg: string;
    protected abstract post<ResponseType = unknown>(
        url: string,
        data?: Record<string, unknown>,
        paramsToAdd?: Record<string, unknown>,
        customHeaders?: Record<string, unknown>,
        customTimeout?: number,
    ): Observable<ResponseType>;

    /* Because of how heavily overloaded the HttpClient's request methods are
    and the way they are structured, it requires a lot of overloading and
    type narrowing on the dev end to make a properly typed wrapper method for it.

    HttpClient: https://angular.io/api/common/http/HttpClient#get
    Issue: https://github.com/angular/angular/issues/18586
    */
    protected abstract get(
        url: string,
        opts: WithResponseType<'arraybuffer'>,
    ): Observable<ArrayBuffer>;
    protected abstract get(url: string, opts: WithResponseType<'blob'>): Observable<Blob>;
    protected abstract get(url: string, opts: WithResponseType<'text'>): Observable<string>;
    protected abstract get<T>(url: string, opts?: WithOptionalJson): Observable<T>;

    protected patch?<ResponseType = unknown>(
        url: string,
        data?: Record<string, unknown>,
        paramsToAdd?: Record<string, unknown>,
        customTimeout?: number,
    ): Observable<ResponseType>;
    protected put?<ResponseType = unknown>(
        url: string,
        data?: Record<string, unknown>,
        paramsToAdd?: Record<string, unknown>,
        customTimeout?: number,
    ): Observable<ResponseType>;
    protected delete?<ResponseType = unknown>(
        url: string,
        params?: Record<string, unknown>,
        customHttpHeaders?: Record<string, unknown>,
        requestTimeout?: number,
    ): Observable<ResponseType>;
}

/**
 * Typing legacy and rest versions this way is only required when the api classes inherit from each other.
 *
 * Once the classes are decoupled we can update these classes to have the correct typing.
 */
export abstract class MediaserverLegacyConnection extends MediaserverBaseConnection {}

/**
 * Typing legacy and rest versions this way is only required when the api classes inherit from each other.
 *
 * Once the classes are decoupled we can update these classes to have the correct typing.
 */
export abstract class MediaserverRestConnection
    extends MediaserverLegacyConnection
    implements Required<MediaserverBaseConnection> {}
