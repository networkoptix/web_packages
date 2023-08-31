import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import staticLang from '@language_static';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { servers } from '@static-variables';

@Injectable()
export class SessionExpiredInterceptor implements HttpInterceptor {
    LANG = staticLang;

    constructor(
        private dialogService: NxDialogsService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
    ) {}

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(error => {
                if (
                    error?.error?.errorId === servers.errors.oldSessionErrorId ||
                    error?.error?.resultCode === servers.errors.userPasswordRequired ||
                    error?.error?.resultCode === servers.errors.vmsRequestFailure
                ) {
                    const system = this.systemService.getCurrentSystem();
                    const cdbSystem = this.systemsService.systems.find(
                        ({ id }) => id === system.id,
                    );

                    return from(
                        this.dialogService.updateSession({
                            sessionState: cdbSystem?.system2faEnabled
                                ? SessionState.Renew2FA
                                : SessionState.RenewWeb,
                            system,
                        }),
                    ).pipe(
                        switchMap(dialogSuccess => {
                            if (dialogSuccess) {
                                const mediaserver = system.mediaserver as NxSystemRestAPI;
                                const accessToken = mediaserver.accessToken;
                                request = request.clone({
                                    headers: request.headers.set(
                                        'Authorization',
                                        `Bearer ${accessToken}`,
                                    ),
                                });
                                return next.handle(request);
                            }
                            return throwError(() => error.error);
                        }),
                    );
                }
                throw error;
            }),
        );
    }
}
