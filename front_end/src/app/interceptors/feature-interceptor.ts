import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { Observable } from 'rxjs';

import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable({ providedIn: 'root' })
export class FeatureInterceptor implements HttpInterceptor {
    #featureFlagOverrides: { [feature: string]: boolean } = {};

    constructor(
        session: LocalStorageService
    ) {
        this.#featureFlagOverrides = session.retrieve(NxConfigService.OVERRIDE_KEY) || {};
        session.observe(NxConfigService.OVERRIDE_KEY).subscribe(overrides => {
            this.#featureFlagOverrides = overrides;
        });
    }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        const overrides = Object.entries(this.#featureFlagOverrides).map(([key, value]) => {
            const [parent, feature] = key.split('.');
            if (parent === 'featureFlags') {
                return [feature, value ? '1' : '0'];
            }

            return null;
        }).filter(val => !!val);

        return next.handle(
            // Prevent feature flag headers from being used with external cloud services. Causes issues in preflight when the header isn't expected.
            overrides.length && request.url.startsWith('/')
                ? request.clone({ headers: overrides.reduce((headers, [feature, val]) => headers.set(`FEATURE_${feature.toUpperCase()}`, val), request.headers) })
                : request
        );
    }
}
