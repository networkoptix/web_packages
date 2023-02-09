import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { throwError, timer, Observable } from 'rxjs';
import { catchError, flatMap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';

import { interceptor } from '../variables/static-variables';

@Injectable()
export class CloudUnavailableInterceptor implements HttpInterceptor {
    LANG = staticLang;
    dialogService: NxDialogsService;
    error: string;
    retryTimeout: number;
    private readonly whiteList: string[] = ['/storage/usageStats'];

    constructor(
        injector: Injector
    ) {
        this.error = interceptor.cloudUnavailable.error;
        this.retryTimeout = interceptor.cloudUnavailable.timeout;
        setTimeout(() => {
            this.dialogService = injector.get(NxDialogsService);
        });
    }

    intercept(
        req: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(
            catchError(response => {
                const { url } = response;
                if (response.error?.resultCode === this.error && !this.whiteList.some(ignoreUrl => url.includes(ignoreUrl))) {
                    return timer(this.retryTimeout).pipe(
                        flatMap(() => next.handle(req)
                            .pipe(catchError(response => {
                                this.dialogService.notify(
                                    this.LANG.toastMessage.cloudUnavailable,
                                    'danger'
                                );
                                return throwError(response);
                            }))));
                }
                return throwError(response);
            }));
    }
}
