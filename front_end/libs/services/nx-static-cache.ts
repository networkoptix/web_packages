import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs/operators';

import { NxConfigService } from './nx-config/nx-config.service';

@Injectable({
    providedIn: 'root'
})
export class NxStaticCacheService {
    CONFIG: any;
    cache = {};

    constructor(private http: HttpClient, config: NxConfigService) {
        this.CONFIG = config.getConfig();
    }

    requestStatic(name) {
        if (this.cache[name]) {
            return this.cache[name];
        }

        this.cache[name] = this.http.get(
            `/${this.CONFIG.viewsDir}static/${name}.html`, { responseType: 'text' }
        ).pipe(
            shareReplay({
                bufferSize: 1,
                refCount: true
            })
        );

        return this.cache[name];
    }
}
