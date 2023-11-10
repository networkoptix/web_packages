import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { debounceTime, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { nxConfig } from '@services/nx-config/config';
import { TosService } from '@services/tos.service';

@Injectable({ providedIn: 'root' })
export class TosInterceptor implements HttpInterceptor {
    tosService = inject(TosService);

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            debounceTime(100),
            tap(async (res: HttpResponse<unknown>) => {
                if (nxConfig.featureFlags.tosRequired && res.status === 451) {
                    await this.tosService.checkTos();
                }
            }),
        );
    }
}
