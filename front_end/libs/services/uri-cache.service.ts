import { HttpEvent, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

type CachedData = HttpResponse<unknown> | Observable<HttpEvent<unknown>>;

@Injectable({
    providedIn: 'root',
})
export class NxUriCacheService {
    private cachedUri: string[] = [];
    private cachedData = new Map<string, CachedData>();

    public setData(key: string, value: CachedData): void {
        this.cachedData.set(key, value);
    }

    public getData(key: string): CachedData {
        return this.cachedData.get(key);
    }

    public deleteData(key: string): void {
        this.cachedData.delete(key);
    }

    public clearData(): void {
        this.cachedData.clear();
    }

    public addedToCache(serviceUri: string): boolean {
        return this.cachedUri.includes(serviceUri);
    }

    public addToCache(serviceUri: string): void {
        // Check if not already added to list
        if (!this.addedToCache(serviceUri)) {
            this.cachedUri.push(serviceUri);
        }
    }
}
