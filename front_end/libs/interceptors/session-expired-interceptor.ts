import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { SessionState } from '@dialogs/update-session/update-session.component.types';
import staticLang from '@language_static';
import { NxStorageService } from '@services/storage.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { servers } from '@static-variables';

@Injectable()
export class SessionExpiredInterceptor implements HttpInterceptor {
    LANG = staticLang;

    constructor(
        private dialogService: NxDialogsService,
        private storageService: NxStorageService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
    ) {}

    // Used to determine the client type for the oauth dialog when refreshing the user's session.
    private calcSessionState(url: string, system: NxSystem): SessionState {
        const cdbSystem = this.systemsService.systems.find(({ id }) => id === system.id);
        // By default, session state is renewing the user's session.
        let sessionState =
            cdbSystem?.system2faEnabled || this.storageService.system2faEnabled
                ? SessionState.Renew2FA
                : SessionState.RenewWeb;

        url = url.replace(/\/v\d\//, '/v*/');
        // Cloud api calls
        if (url.includes('/api/systems/disconnect')) {
            sessionState = SessionState.Disconnect;
        } else if (url.includes('/api/systems/merge')) {
            sessionState = SessionState.Merge;
        } else if (url.includes('/api/transfer/')) {
            sessionState = SessionState.Transfer;
        }
        // Mediaserver api calls
        else if (url.includes('/rest/v*/servers')) {
            // The action is at the end of the url.
            // Since the id can be a guid or this we skip that part.
            if (url.includes('detach')) {
                sessionState = SessionState.Detach;
            } else if (url.includes('reset')) {
                sessionState = SessionState.Reset;
            } else if (url.includes('restart')) {
                sessionState = SessionState.Restart;
            }
        } else if (url.includes('/rest/v*/system')) {
            if (url.includes('merge')) {
                sessionState = SessionState.Merge;
            } else if (url.includes('cloudUnbind')) {
                sessionState = SessionState.Disconnect;
            }
        }
        return sessionState;
    }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(error => {
                if (
                    error?.error?.errorId === servers.errors.oldSessionErrorId ||
                    error?.error?.resultCode === servers.errors.userPasswordRequired ||
                    error?.error?.resultCode === servers.errors.vmsRequestFailure
                ) {
                    const system = this.systemService.getCurrentSystem();

                    return from(
                        this.dialogService.updateSession({
                            sessionState: this.calcSessionState(request.url, system),
                            system,
                        }),
                    ).pipe(
                        switchMap(dialogSuccess => {
                            if (dialogSuccess) {
                                const mediaserver = system.mediaserver as NxSystemRestAPI;
                                const accessToken = mediaserver.accessToken;
                                request = request.clone({
                                    headers: request.headers
                                        .set('Authorization', `Bearer ${accessToken}`)
                                        .set('x-runtime-guid', accessToken),
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
