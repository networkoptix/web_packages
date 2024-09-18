import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, flatMap } from 'rxjs/operators';

import { ToastType } from '@components/toast-container/toast.types';
import staticLang from '@language_static';
import { NxToastService } from '@services/toast.service';

@Injectable()
export class CloudUnavailableInterceptor implements HttpInterceptor {
    LANG = staticLang;
    error: string;
    retryTimeout: number;
    readonly interceptor = {
        cloudUnavailable: {
            error: 'cloudInvalidResponse',
            timeout: 5 * 1000,
        },
    };

    private readonly whiteList: string[] = ['/storage/usageStats'];

    constructor(private toastService: NxToastService) {
        this.error = this.interceptor.cloudUnavailable.error;
        this.retryTimeout = this.interceptor.cloudUnavailable.timeout;
    }

    intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(
            catchError(response => {
                const { url } = response;
                if (
                    response.error?.resultCode === this.error &&
                    !this.whiteList.some(ignoreUrl => url.includes(ignoreUrl))
                ) {
                    return timer(this.retryTimeout).pipe(
                        flatMap(() =>
                            next.handle(req).pipe(
                                catchError(response => {
                                    this.toastService.notify(
                                        this.LANG.toastMessage.cloudUnavailable,
                                        ToastType.Danger,
                                    );
                                    return throwError(response);
                                }),
                            ),
                        ),
                    );
                }
                return throwError(response);
            }),
        );
    }
}
