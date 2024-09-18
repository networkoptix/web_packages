import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SessionStorageService } from 'ngx-webstorage';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SessionState } from '@dialogs/update-session/update-session.component.types';
import { NxAccountService } from '@services/account.service';
import { OauthService } from '@services/oauth.service';
import { NxSystemsService } from '@services/systems.service';
import { isSessionTruncatedError } from '@variables/api-errors';

@Injectable()
export class CloudSessionTruncatedInterceptor implements HttpInterceptor {
    systemsService = inject(NxSystemsService);
    oathService = inject(OauthService);
    accountService = inject(NxAccountService);
    sessionStorage = inject(SessionStorageService);

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(error => {
                if (isSessionTruncatedError(error)) {
                    this.sessionStorage.clear();
                    this.accountService.logoutHelper(true, true);
                    this.oathService.redirectOauth({
                        state: SessionState.RenewWeb,
                        email: this.systemsService.userEmail,
                        redirectTo: window.location.href,
                    });
                }
                throw error;
            }),
        );
    }
}
