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
            if (res instanceof HttpErrorResponse && [502, 504].includes(res.status)) {
                this.appState.systemAvailable$.next(false);
            } else if (res instanceof HttpResponse && this.appState.systemAvailable$.value === false) {
                this.appState.systemAvailable$.next(true);
            }
        }
    }
}
