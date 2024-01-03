import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

const REDIRECT_HEADER = 'Relay-Redirects-Followed';
const MAX_REDIRECT = 10;

@Injectable()
/**
 * Authorization header is lost when the relay redirects so those requests always return a 401.
 *
 * This retries the request using the url from the redirect.
 *
 * Follows up to 10 redirects. There are cases where the relay could accidentally enter a redirect
 * loop so we want to set a limit.
 */
export class RedirectAuthenticationInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError(err => {
                if (err instanceof HttpErrorResponse) {
                    const previousRedirects = parseInt(request.headers.get(REDIRECT_HEADER) || '0');
                    const redirectCount = isNaN(previousRedirects) ? 0 : previousRedirects;
                    const requestUrl = `${
                        request.urlWithParams.startsWith('/') ? window.location.origin : ''
                    }${request.urlWithParams}`;

                    if (
                        err.status === 401 &&
                        err.url &&
                        requestUrl !== err.url &&
                        redirectCount < MAX_REDIRECT
                    ) {
                        const clonedRequest = request.clone({
                            url: err.url,
                            headers: request.headers.set(
                                REDIRECT_HEADER,
                                (redirectCount + 1).toString(),
                            ),
                        });
                        return next.handle(clonedRequest);
                    }
                }

                return throwError(() => err);
            }),
        );
    }
}
