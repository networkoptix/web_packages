import { waitForAsync, TestBed } from '@angular/core/testing';

import { NxUriCacheService } from '@services/uri-cache.service';

describe('Uri cache Service', () => {
    let uriCacheService: NxUriCacheService;
    let cachedUri: any[];
    let cachedUData = new Map<string, any>();

    const uri = '/documentation';

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxUriCacheService
            ]
        });
        uriCacheService = TestBed.inject(NxUriCacheService);
        cachedUri = uriCacheService['cachedUri'];
        cachedUData = uriCacheService['cachedData'];
    }));

    it('should create the service', () => {
        expect(uriCacheService).toBeTruthy();
    });

    it('should add item to "cachedUri" if unique', () => {
        uriCacheService.addToCache(uri);
        uriCacheService.addToCache(uri); // this also will test "addedToCache()"

        expect(cachedUri).toEqual(['/documentation']);
    });

    it('should add item to "cachedData" if unique', () => {
        uriCacheService.setData('abc', uri);
        uriCacheService.setData('abc', uri);

        expect(cachedUData.size).toBe(1);
    });

    it('should get item from "cachedData"', () => {
        uriCacheService.setData('abc', uri);
        expect(cachedUData.size).toBe(1);
        expect(uriCacheService.getData('abc')).toBe(uri);
        expect(uriCacheService.getData('xyz')).toBeUndefined();
    });

    it('should delete item from "cachedData"', () => {
        uriCacheService.setData('abc', uri);
        expect(cachedUData.size).toBe(1);
        uriCacheService.deleteData('abc');
        expect(cachedUData.size).toBe(0);
    });

    it('should clear "cachedData"', () => {
        uriCacheService.setData('abc', uri);
        uriCacheService.setData('xyz', uri);
        expect(cachedUData.size).toBe(2);

        uriCacheService.clearData();
        expect(cachedUData.size).toBe(0);
    });
});
