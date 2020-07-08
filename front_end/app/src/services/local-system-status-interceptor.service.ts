import { Injectable } from '@angular/core';
import {
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse,
    HttpErrorResponse,
    HttpEvent
} from '@angular/common/http';

import { NxAppStateService } from './nx-app-state.service';
import { NxConfigService, IConfig } from './nx-config';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class LocalSystemStatusInterceptor implements HttpInterceptor {
    CONFIG: IConfig;
    lastErrorStatus: number;

    constructor(
        configService: NxConfigService,
        private appState: NxAppStateService
    ) {
        this.CONFIG = configService.getConfig();
    }

    public intercept(httpRequest: HttpRequest<any>, handler: HttpHandler): Observable<HttpEvent<any>> {
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
        if (this.CONFIG.isLocal) {
            if (res instanceof HttpErrorResponse && [504, 502, 0].includes(res.status)) {
                this.lastErrorStatus = res.status;
                this.appState.systemAvailable$.next(false);
            } else if (res instanceof HttpResponse && this.appState.systemAvailable$.value === false) {
                this.appState.systemAvailable$.next(true);
                // 502 and 0 for no response from user end (i.e. wifi out); undefined case from timeout
                if (![502, 0, undefined].includes(this.lastErrorStatus)) {
                    window.location.reload();
                }
            }
        }
    }
}
