import {
    type HttpEvent,
    type HttpHandler,
    HttpInterceptor,
    type HttpRequest,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxSystemService } from '@services/system.service/system.service';
import { isSessionTruncatedError } from '@variables/api-errors';

let isAuthenticationDialogOpen = false;

@Injectable()
export class CloudSessionTruncatedInterceptor implements HttpInterceptor {
    private systemService = inject(NxSystemService);
    private dialogService = inject(NxDialogsService);

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(error => {
                if (isSessionTruncatedError(error) && !isAuthenticationDialogOpen) {
                    isAuthenticationDialogOpen = true;
                    this.systemService.getCurrentSystem().forceStopAllPolls();
                    this.dialogService.openAuthenticationApp().finally(() => {
                        // If the dialog was closed then that means the user did NOT login
                        // We should redirect them back to the home page
                        isAuthenticationDialogOpen = false;
                        window.location.href = '/';
                    });
                }
                throw error;
            }),
        );
    }
}
