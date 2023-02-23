import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { share, tap } from 'rxjs/operators';

import { NxUriCacheService } from '@services/uri-cache.service';

// Add the service we created in Step 1

@Injectable()
export class NxUriCachingInterceptor implements HttpInterceptor {
    constructor(private cacheRegistrationService: NxUriCacheService) {}

    public intercept(
        httpRequest: HttpRequest<unknown>,
        handler: HttpHandler,
    ): Observable<HttpEvent<unknown>> {
        // Don't cache if
        // 1. It's not a GET request
        // 2. If URI is not supposed to be cached
        if (httpRequest.method === 'GET' && httpRequest.headers.get('cache-request')) {
            this.cacheRegistrationService.addToCache(httpRequest.urlWithParams);
        } else if (
            httpRequest.method !== 'GET' ||
            !this.cacheRegistrationService.addedToCache(httpRequest.urlWithParams)
        ) {
            return handler.handle(httpRequest);
        }

        // Also leave scope of resetting already cached data for a URI
        if (httpRequest.headers.get('reset-cache')) {
            this.cacheRegistrationService.deleteData(httpRequest.urlWithParams);
        }
        // Checked if there is cached data for this URI
        const lastResponse = this.cacheRegistrationService.getData(httpRequest.urlWithParams);
        if (lastResponse) {
            // In case of parallel requests to same URI,
            // return the request already in progress
            // otherwise return the last cached data
            return lastResponse instanceof Observable ? lastResponse : of(lastResponse.clone());
        }

        // If the request of going through for first time
        // then let the request proceed and cache the response
        const requestHandle = handler.handle(httpRequest).pipe(
            share(),
            tap(stateEvent => {
                if (stateEvent instanceof HttpResponse) {
                    this.cacheRegistrationService.setData(
                        httpRequest.urlWithParams,
                        stateEvent.clone(),
                    );
                }
            }),
        );

        // Meanwhile cache the request Observable to handle parallel request
        this.cacheRegistrationService.setData(httpRequest.urlWithParams, requestHandle);

        return requestHandle;
    }
}
