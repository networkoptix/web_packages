import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NxSwCacheService {
    clearAllCache(): Promise<boolean[][]> {
        return this.clearCacheByNameOrAll(undefined, true);
    }

    clearByName(cache): Promise<boolean[][]> {
        return this.clearCacheByNameOrAll(this.dataCacheName(cache), false);
    }

    clearCache(cache, baseUrl: string): Promise<boolean[]> {
        return this.clearCacheByUrl(this.dataCacheName(cache), baseUrl);
    }

    private dataCacheName(cache) {
        return `ngsw:/:1:data:dynamic:${cache}:cache`;
    }

    private clearCacheByNameOrAll(nameCacheParam: string, allKeys: boolean) {
        return caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return (
                        allKeys &&
                        cacheName.startsWith('ngsw:/:1:data:dynamic')
                    ) || nameCacheParam === cacheName;
                }).map(cacheName => {
                    return caches.open(cacheName).then(c => {
                        return c.keys().then(keys => {
                            return Promise.all(
                                keys.map(key => {
                                    return c.delete(key);
                                })
                            );
                        });
                    });
                })
            );
        });
    }

    private clearCacheByUrl(nameCache: string, url: string) {
        return caches.open(nameCache).then(c => {
            return c.keys().then(keys => {
                return Promise.all(
                    keys.filter(p => {
                        return p.url.includes(url);
                    }).map(keySearched => {
                        return c.delete(keySearched);
                    })
                );
            });
        });
    }
}
