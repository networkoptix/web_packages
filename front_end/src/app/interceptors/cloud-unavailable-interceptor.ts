import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { throwError, timer, Observable } from 'rxjs';
import { catchError, flatMap } from 'rxjs/operators';

import type { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Injectable()
export class CloudUnavailableInterceptor implements HttpInterceptor {
    LANG: LanguageI18NStaticTypes;
    dialogService: NxDialogsService;
    error: string;
    retryTimeout: number;

    constructor(
        configService: NxConfigService,
        injector: Injector
    ) {
        const CONFIG = configService.getConfig();
        this.error = CONFIG.interceptor.cloudUnavailable.error;
        this.retryTimeout = CONFIG.interceptor.cloudUnavailable.timeout;
        setTimeout(() => {
            this.LANG = injector.get(NxLanguageProviderService).translations;
            this.dialogService = injector.get(NxDialogsService);
        });
    }

    intercept(
        req: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        return next.handle(req).pipe(
            catchError(response => {
                if (response.error?.resultCode === this.error) {
                    return timer(this.retryTimeout).pipe(
                        flatMap(() => next.handle(req)
                            .pipe(catchError(response => {
                                this.dialogService.notify(
                                    this.LANG.toastMessage.cloudUnavailable(),
                                    'danger'
                                );
                                return throwError(response);
                            }))));
                }
                return throwError(response);
            }));
    }
}
