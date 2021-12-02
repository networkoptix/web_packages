import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs/operators';

import { NxConfigService } from './nx-config';

@Injectable({
    providedIn: 'root'
})
export class NxStaticCacheService {
    CONFIG: any;
    cache = {};

    constructor(
        private http: HttpClient,
        private config: NxConfigService
    ) {
        this.CONFIG = config.getConfig();
    }

    requestStatic(name) {
        if (this.cache[name]) {
            return this.cache[name];
        }

        this.cache[name] = this.http.get(
            `/${this.CONFIG.viewsDir}static/${name}.html`, { responseType: 'text' }
        ).pipe(shareReplay(1));
        return this.cache[name];
    }
}
