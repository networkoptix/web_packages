import { Injectable } from '@angular/core';

@Injectable()
export class NxUriCacheService {
    private cachedUri = [];
    private cachedData = new Map<string, any>();

    public setData(key: string, value: any) {
        this.cachedData.set(key, value);
    }

    public getData(key: string) {
        return this.cachedData.get(key);
    }

    public deleteData(key: string) {
        this.cachedData.delete(key);
    }

    public clearData() {
        this.cachedData.clear();
    }

    public addedToCache(serviceUri: string) {
        return this.cachedUri.includes(serviceUri);
    }

    public addToCache(serviceUri: string) {
        // Check if not already added to list
        if (!this.addedToCache(serviceUri)) {
            this.cachedUri.push(serviceUri);
        }
    }
}
