import { Injectable } from '@angular/core';

@Injectable()
export class NxUriCacheService {
    private services = [];
    public cachedData = new Map<string, any>();

    public addedToCache(serviceUri: string) {
        return this.services.indexOf(serviceUri) > -1;
    }

    public addToCache(serviceUri: string) {
        // Check if not already added to list
        if (!this.addedToCache(serviceUri)) {
            this.services.push(serviceUri);
        }
    }
}
