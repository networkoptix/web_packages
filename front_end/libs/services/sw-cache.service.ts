import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class NxSwCacheService {
    clearAllCache(): Promise<boolean[][]> {
        return this.clearCacheByNameOrAll(undefined, true);
    }

    clearByName(cache: string): Promise<boolean[][]> {
        return this.clearCacheByNameOrAll(this.dataCacheName(cache), false);
    }

    clearCache(cache: string, baseUrl: string): Promise<boolean[]> {
        return this.clearCacheByUrl(this.dataCacheName(cache), baseUrl);
    }

    private dataCacheName(cache: string): string {
        return `ngsw:/:1:data:dynamic:${cache}:cache`;
    }

    private clearCacheByNameOrAll(nameCacheParam: string, allKeys: boolean): Promise<boolean[][]> {
        return caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => {
                        return (
                            (allKeys && cacheName.startsWith('ngsw:/:1:data:dynamic')) ||
                            nameCacheParam === cacheName
                        );
                    })
                    .map(cacheName => {
                        return caches.open(cacheName).then(c => {
                            return c.keys().then(keys => {
                                return Promise.all(keys.map(key => c.delete(key)));
                            });
                        });
                    }),
            );
        });
    }

    private clearCacheByUrl(nameCache: string, url: string): Promise<boolean[]> {
        return caches.open(nameCache).then(c => {
            return c.keys().then(keys => {
                return Promise.all(
                    keys.filter(p => p.url.includes(url)).map(keySearched => c.delete(keySearched)),
                );
            });
        });
    }
}
