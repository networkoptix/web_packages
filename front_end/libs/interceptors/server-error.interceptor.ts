import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { inject, Injectable, isDevMode } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ToastType } from '@components/toast-container/toast.types';
import { nxConfig } from '@services/nx-config/config';
import { NxToastService } from '@services/toast.service';
import { selectCurrentUser } from '@store/account/account.selectors';

@Injectable()
export class ServerErrorInterceptor implements HttpInterceptor {
    private toastService = inject(NxToastService);
    private store = inject(Store);
    private account$$ = this.store.selectSignal(selectCurrentUser);

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(error => {
                const flagEnabled = nxConfig.featureFlags.use500ErrorInterceptor;
                const devEnv = isDevMode();
                const qaEnv = this.account$$()?.is_staff && location.host.endsWith('.hdw.mx');
                if (devEnv || (flagEnabled && qaEnv)) {
                    if (error instanceof HttpErrorResponse && error.status === 500) {
                        this.toastService.notify(
                            `500 Internal Server Error from ${request.method} to ${request.url} logged`,
                            ToastType.Danger,
                        );
                        console.warn(request);
                        console.error(error);
                    }
                }
                throw error;
            }),
        );
    }
}
