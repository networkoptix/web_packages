import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

interface CurrentRelayHost {
    currentRelayHost: string;
}

@Injectable({ providedIn: 'root' })
export class NxCurrentRelayInterceptor implements HttpInterceptor {
    static currentRelays: Record<string, CurrentRelayHost> = {};

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            tap(event => {
                if (request.url.startsWith('/')) {
                    return;
                }

                const initialRelay = this.getBase(request.url);

                if (
                    event instanceof HttpResponse &&
                    event.url !== request.url &&
                    initialRelay in NxCurrentRelayInterceptor.currentRelays
                ) {
                    const resolvedRelay = this.getBase(event.url);
                    this.updateCachedRelay(initialRelay, resolvedRelay);
                }
            }),
        );
    }

    private getBase = (url: string): string => url.split('://').pop().split('/').shift();

    private updateCachedRelay(initialRelay: string, updatedRelay: string): void {
        const requestedRelay = NxCurrentRelayInterceptor.currentRelays[initialRelay];
        if (requestedRelay) {
            const updatedRelayHost = updatedRelay;
            requestedRelay.currentRelayHost = updatedRelayHost;
            NxCurrentRelayInterceptor.currentRelays[updatedRelayHost] = requestedRelay;
            delete NxCurrentRelayInterceptor.currentRelays[initialRelay];
        }
    }
}
