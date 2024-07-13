import { HttpHeaders, HttpParams } from '@angular/common/http';

export type int = number;
export type uuid = string;
export type email = string;
export type datetime = string;
export type url = string;

export interface BaseRequestOptions {
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

export interface PostRequestOptions extends BaseRequestOptions {}
