import { HttpResponse } from '@angular/common/http';
import { v4 as uuid } from 'uuid';

import { setupTestBed } from './src/setup';
import { NxUriCacheService } from './uri-cache.service';

const setupUriCacheService = async (): Promise<{
    uri: string;
    resp: HttpResponse<unknown>;
    uriCacheService: NxUriCacheService;
    cachedUri: NxUriCacheService['cachedUri'];
    cachedUData: NxUriCacheService['cachedData'];
    cacheKeys: [string, string];
}> => {
    const { inject } = await setupTestBed();
    const uriCacheService = inject(NxUriCacheService);
    const cachedUri = uriCacheService['cachedUri'];
    const cachedUData = uriCacheService['cachedData'];

    const uri = '/documentation';
    const resp = new HttpResponse<unknown>();

    const cacheKeys: [string, string] = [uuid(), uuid()];

    return {
        uri,
        resp,
        cachedUri,
        cachedUData,
        uriCacheService,
        cacheKeys
    };
};

describe('Uri cache Service', () => {
    it('should create the service', async () => {
        const { uriCacheService } = await setupUriCacheService();
        expect(uriCacheService).toBeTruthy();
    });

    it('should add item to "cachedUri" if unique', async () => {
        const { uriCacheService, uri, cachedUri } = await setupUriCacheService();
        uriCacheService.addToCache(uri);
        uriCacheService.addToCache(uri); // this also will test "addedToCache()"

        expect(cachedUri).toEqual(['/documentation']);
    });

    it('should add item to "cachedData" if unique', async () => {
        const { uriCacheService, resp, cachedUData, cacheKeys: [key] } = await setupUriCacheService();
        uriCacheService.setData(key, resp);
        uriCacheService.setData(key, resp);

        expect(cachedUData.size).toBe(1);
    });

    it('should get item from "cachedData"', async () => {
        const { uriCacheService, resp, cachedUData, cacheKeys: [key1, key2] } = await setupUriCacheService();
        uriCacheService.setData(key1, resp);
        expect(cachedUData.size).toBe(1);
        expect(uriCacheService.getData(key1)).toBe(resp);
        expect(uriCacheService.getData(key2)).toBeUndefined();
    });

    it('should delete item from "cachedData"', async () => {
        const { uriCacheService, resp, cachedUData, cacheKeys: [key1] } = await setupUriCacheService();
        uriCacheService.setData(key1, resp);
        expect(cachedUData.size).toBe(1);
        uriCacheService.deleteData(key1);
        expect(cachedUData.size).toBe(0);
    });

    it('should clear "cachedData"', async () => {
        const { uriCacheService, resp, cachedUData, cacheKeys: [key1, key2] } = await setupUriCacheService();
        uriCacheService.setData(key1, resp);
        uriCacheService.setData(key2, resp);
        expect(cachedUData.size).toBe(2);

        uriCacheService.clearData();
        expect(cachedUData.size).toBe(0);
    });
});
