import {
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse,
    HttpErrorResponse,
    HttpEvent
} from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { environment } from '@environments/environment';
import { NxAppStateService } from '@services/nx-app-state.service';
import { WINDOW } from '@services/window-provider';

@Injectable()
export class LocalSystemStatusInterceptor implements HttpInterceptor {
    isDialogActive = false;

    constructor(
        private appState: NxAppStateService,
        private dialogService: NxSimpleDialogsService,
        @Inject(WINDOW) private window: Window
    ) {
    }

    public intercept(httpRequest: HttpRequest<any>, handler: HttpHandler): Observable<HttpEvent<any>> {
        if (!environment.isLocal || httpRequest.headers.get('X-Server-Guid')) {
            return handler.handle(httpRequest);
        }
        return handler.handle(httpRequest)
            .pipe(
                tap(
                    res => this.checkIfSystemAvailable(res),
                    err => this.checkIfSystemAvailable(err)
                )
            );
    }

    // appState.systemAvailable for webadmin, overlay-modal.component
    checkIfSystemAvailable(res: any) {
        // replace OR as "0 || undefined" makes offline status "false"
        const status = res.status !== undefined ? res.status : res.type !== undefined ? res.type : 0;

        const offlineStatus = [504, 502, 0].includes(status);
        const errorStatus = [504, 502, 0].includes(this.appState.lastErrorStatus$.value);

        if (res instanceof HttpErrorResponse && offlineStatus && offlineStatus !== errorStatus) {
            this.appState.lastErrorStatus$.next(status);
            this.appState.systemAvailable$.next(false);
        } else if (res instanceof HttpErrorResponse && status === 401) {
            // Session expired
            if (this.isDialogActive) {
                return;
            }
            this.isDialogActive = true;
            return this.dialogService.expiredSession()
                .then(() => this.window.location.reload());
        } else if (res instanceof HttpResponse && this.appState.systemAvailable$.value === false && this.appState.lastErrorStatus$.value !== undefined) {
            this.appState.systemAvailable$.next(true);

            // lastErrorStatus$ could be "0" (because of res.type) ...
            if (this.appState.lastErrorStatus$.value !== undefined) {
                offlineStatus && window.location.reload();
                this.appState.lastErrorStatus$.next(undefined);
            }
        }
    }
}
