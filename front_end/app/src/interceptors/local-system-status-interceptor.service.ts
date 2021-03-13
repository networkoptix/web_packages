import { Injectable } from '@angular/core';
import {
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse,
    HttpErrorResponse,
    HttpEvent
}                     from '@angular/common/http';
import { tap }        from 'rxjs/operators';
import { Observable } from 'rxjs';

import { environment }       from '@environments/environment';
import { NxAppStateService } from '@services/nx-app-state.service';

@Injectable()
export class LocalSystemStatusInterceptor implements HttpInterceptor {
    constructor(private appState: NxAppStateService) {
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
        const offlineStatus = [504, 502, 0].includes(res.status);
        const errorStatus = [504, 502, 0].includes(this.appState.lastErrorStatus$.value);

        if (res instanceof HttpErrorResponse && offlineStatus && offlineStatus !== errorStatus) {
            this.appState.lastErrorStatus$.next(res.status);
            this.appState.systemAvailable$.next(false);
        } else if (res instanceof HttpResponse && this.appState.systemAvailable$.value === false && this.appState.lastErrorStatus$.value) {
            this.appState.systemAvailable$.next(true);
            // only 504 = server went offline
            if (!this.appState.lastErrorStatus$.value) {
                window.location.reload();
                this.appState.lastErrorStatus$.next(undefined);
            }
        }
    }
}
