import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';

@Injectable()
export class NxSwCacheInterceptor implements HttpInterceptor {
    constructor(private cloudApiService: NxCloudApiService) {}

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        if (request.url.startsWith('/') && this.cloudApiService.swBypass) {
            const newRequest = request.clone({
                headers: request.headers.set('ngsw-bypass', 'true'),
            });
            return next.handle(newRequest);
        }

        return next.handle(request);
    }
}
