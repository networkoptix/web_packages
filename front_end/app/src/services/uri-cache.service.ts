import { Injectable } from '@angular/core';

@Injectable()
export class NxUriCacheService {
    private cachedUri = [];
    private cachedData = new Map<string, any>();

    public setData(key: string, value: any): void {
        this.cachedData.set(key, value);
    }

    public getData(key: string) {
        return this.cachedData.get(key);
    }

    public deleteData(key: string): void {
        this.cachedData.delete(key);
    }

    public clearData(): void {
        this.cachedData.clear();
    }

    public addedToCache(serviceUri: string) {
        return this.cachedUri.includes(serviceUri);
    }

    public addToCache(serviceUri: string): void {
        // Check if not already added to list
        if (!this.addedToCache(serviceUri)) {
            this.cachedUri.push(serviceUri);
        }
    }
}
