import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import staticLang from '@language_static';
import { NxSessionService } from '@services/session.service';
import { NxSystemService } from '@services/system.service/system.service';
import { servers, redirect } from '@static-variables';

@Injectable()
export class UnauthorizedUserInterceptor implements HttpInterceptor {
    LANG = staticLang;

    constructor(
        private systemService: NxSystemService,
        private cookieService: CookieService,
        private sessionService: NxSessionService,
        private router: Router,
    ) {}

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(error => {
                const {
                    error: { errorString, errorId },
                } = error || { error: {} };
                if (
                    errorString === servers.errors.wrongSessionToken ||
                    errorId === servers.errors.unauthorized
                ) {
                    this.router.navigate([redirect.unauthorised]).finally(() => {
                        this.systemService
                            .getCurrentSystem()
                            .mediaserver.logout()
                            .finally(() => {
                                this.cookieService.deleteAll();
                                this.sessionService.invalidateSession(); // Clear session
                                window.location.reload();
                            });
                    });
                }
                throw error;
            }),
        );
    }
}
