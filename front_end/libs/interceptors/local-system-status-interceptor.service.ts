import {
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse,
    HttpErrorResponse,
    HttpEvent,
} from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxAppStateService } from '@services/nx-app-state.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { servers } from '../variables/static-variables';

@Injectable()
export class LocalSystemStatusInterceptor implements HttpInterceptor {
    CONFIG: IConfig;
    isDialogActive = false;

    constructor(
        configService: NxConfigService,
        private appState: NxAppStateService,
        private dialogs: NxDialogsService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.config;
    }

    public intercept(
        httpRequest: HttpRequest<unknown>,
        handler: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        if (!environment.isLocal || httpRequest.headers.get('X-Server-Guid')) {
            return handler.handle(httpRequest);
        }
        return handler.handle(httpRequest).pipe(
            tap(
                (res: HttpResponse<unknown>) => {
                    this.checkIfSystemAvailable(res);
                },
                (err: HttpErrorResponse) => {
                    this.checkIfSystemAvailable(err);
                },
            ),
        );
    }

    // appState.systemAvailable for webadmin, overlay-modal.component
    private checkIfSystemAvailable(res: HttpResponse<unknown> | HttpErrorResponse): void {
        // Ignore external requests
        try {
            const url = new URL(res.url);
            if (url.hostname !== this.window.location.hostname) {
                return;
            }
        } catch (e) {
            // Ignore invalid URLs
        }

        // res might be just { type: number } and not full response
        const url = res.url && new URL(res.url, this.window.location.origin);
        if (url?.pathname.startsWith('/static') || url?.pathname.includes('proxy')) {
            // Don't check on request for static resource
            return;
        }

        // replace OR as "0 || undefined" makes offline status "false"
        const status =
            res.status !== undefined ? res.status : res.type !== undefined ? res.type : 0;

        const offlineStatus = [504, 502, 0].includes(status);
        const errorStatus = [504, 502, 0].includes(this.appState.lastErrorStatus$.value);

        if (res instanceof HttpErrorResponse && offlineStatus && offlineStatus !== errorStatus) {
            // Don't show overlay if we're showing session dialog
            if (this.isDialogActive) {
                return;
            }

            this.appState.lastErrorStatus$.next(status);
            this.appState.systemAvailable$.next(false);
        } else if (
            (res instanceof HttpErrorResponse &&
                (status === 401 ||
                    (status === 422 &&
                        res.url.includes('rest/v1/login/sessions') &&
                        res.error?.errorId === servers.errors.oldSessionErrorId))) ||
            (status === 0 && res.url?.includes('oauth/token'))
        ) {
            // Session expired
            if (this.isDialogActive) {
                return;
            }
            // remove overlay if visible
            this.appState.systemAvailable$.next(true);
            this.isDialogActive = true;
            this.dialogs.expiredSession().then(() => this.window.location.reload());
        } else if (
            res instanceof HttpResponse &&
            this.appState.systemAvailable$.value === false &&
            this.appState.lastErrorStatus$.value !== undefined &&
            url?.origin !== this.CONFIG.cloudHost // avoid making system online if cloud request succeed
        ) {
            this.appState.systemAvailable$.next(true);

            // lastErrorStatus$ could be "0" (because of res.type) ...
            if (this.appState.lastErrorStatus$.value !== undefined) {
                offlineStatus && this.window.location.reload();
                this.appState.lastErrorStatus$.next(undefined);
            }
        }
    }
}
