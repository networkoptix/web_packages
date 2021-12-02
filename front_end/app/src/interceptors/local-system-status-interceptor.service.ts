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

import { environment } from '@environments/environment';
import { NxAppStateService } from '@services/nx-app-state.service';
import { WINDOW } from '@services/window-provider';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';

@Injectable()
export class LocalSystemStatusInterceptor implements HttpInterceptor {
    LANG: LanguageI18NStaticTypes;
    isDialogActive = false;

    constructor(
        languageProvider: NxLanguageProviderService,
        private appState: NxAppStateService,
        private dialogService: NxSimpleDialogsService,
        @Inject(WINDOW) private window: Window
    ) {
        languageProvider.translateSubject.subscribe((lang) => { this.LANG = lang; });
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
            let dialogPromise = Promise.resolve();
            if (!this.isDialogActive) {
                this.isDialogActive = true;
                dialogPromise = this.dialogService.confirm(
                    this.LANG.dialogs.renewAuth.message(),
                    this.LANG.dialogs.renewAuth.title(),
                    this.LANG.dialogs.buttons.ok()
                );
            }
            return dialogPromise.then(() => this.window.location.reload());
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
