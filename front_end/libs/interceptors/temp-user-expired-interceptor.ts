import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import staticLang from '@language_static';
import { NxSessionService } from '@services/session.service';
import { UserType } from '@services/system-user.types';
import { NxSystemService } from '@services/system.service/system.service';
import { WINDOW } from '@services/window-provider';
import { servers, redirect } from '@static-variables';

@Injectable()
export class TempUserExpiredInterceptor implements HttpInterceptor {
    LANG = staticLang;

    constructor(
        private systemService: NxSystemService,
        private cookieService: CookieService,
        private sessionService: NxSessionService,
        private router: Router,
        @Inject(WINDOW) private window: Window,
    ) {}

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(error => {
                if (
                    error?.error?.errorString === servers.errors.wrongSessionToken &&
                    this.systemService.getCurrentSystem().userManager.currentUser.type ===
                        UserType.temporaryLocal
                ) {
                    this.router.navigate([redirect.unauthorised]).finally(() => {
                        this.systemService
                            .getCurrentSystem()
                            .mediaserver.logout()
                            .finally(() => {
                                this.cookieService.deleteAll();
                                this.sessionService.invalidateSession(); // Clear session
                                this.window.location.reload();
                            });
                    });
                }
                throw error;
            }),
        );
    }
}
