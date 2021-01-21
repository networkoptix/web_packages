import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { catchError, flatMap } from 'rxjs/operators';
import { throwError, timer } from 'rxjs';

import { NxConfigService } from '../services/nx-config';
import { NxDialogsService } from '../dialogs/dialogs.service';
import { NxLanguageProviderService } from '../services/nx-language-provider';

@Injectable()
export class CloudUnavailableInterceptor implements HttpInterceptor {
    LANG: any;
    error: string;
    retryTimeout: number;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private dialogService: NxDialogsService
    ) {
        const CONFIG = configService.getConfig();
        this.LANG = language.translations;
        this.error = CONFIG.interceptor.cloudUnavailable.error;
        this.retryTimeout = CONFIG.interceptor.cloudUnavailable.timeout;
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((response) => {
                if (response.error.resultCode === this.error) {
                    return timer(this.retryTimeout).pipe(
                        flatMap(() => next.handle(req)
                            .pipe(catchError((response) => {
                                this.dialogService.notify(this.LANG.toastMessage.cloudUnavailable, 'danger');
                                return throwError(response);
                            }))));
                }
                return throwError(response);
            }));
    }
}
