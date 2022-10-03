import {
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { NxCloudApiService } from '@services/nx-cloud-api';

@Injectable()
export class oauth2Interceptor implements HttpInterceptor {
    private refreshTokenInProgress = false;
    private refreshTokenSubject: Subject<any> = new BehaviorSubject<any>(undefined);
    constructor(private cloudApi: NxCloudApiService) {
    }

    public intercept(req: HttpRequest<any>, next: HttpHandler) {
        return next.handle(this.addHeader(req)).pipe(
            catchError((e: HttpResponse<any>) => {
                if (!this.refreshTokenInProgress) {
                    this.refreshTokenInProgress = true;
                    this.refreshTokenSubject.next(undefined);
                    return this.cloudApi.refreshToken().pipe(
                        switchMap((res) => {
                            this.refreshTokenInProgress = false;
                            this.refreshTokenSubject.next(res.access_token);
                            return next.handle(this.addHeader(req));
                        })
                    );
                } else if (!e.url.includes('/account/refresh')) {
                    return this.refreshTokenSubject.pipe(
                        filter(res => res !== undefined),
                        take(1),
                        switchMap(() => next.handle(this.addHeader(req))));
                }
                return next.handle(this.addHeader(req));
            })
        );
    }

    private addHeader(req: HttpRequest<any>) {
        return req.clone({
            setHeaders: {
                Authorization: `Bearer ${this.cloudApi.accessToken}`
            }
        });
    }
}
