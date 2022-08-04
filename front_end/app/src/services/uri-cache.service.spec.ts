import { HttpResponse } from '@angular/common/http';
import { waitForAsync, TestBed } from '@angular/core/testing';

import { NxUriCacheService } from './uri-cache.service';

describe('Uri cache Service', () => {
    let uriCacheService: NxUriCacheService;
    let cachedUri: NxUriCacheService['cachedUri'];
    let cachedUData: NxUriCacheService['cachedData'];

    const uri = '/documentation';
    const resp = new HttpResponse<unknown>();

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
        uriCacheService.setData('abc', resp);
        uriCacheService.setData('abc', resp);

        expect(cachedUData.size).toBe(1);
    });

    it('should get item from "cachedData"', () => {
        uriCacheService.setData('abc', resp);
        expect(cachedUData.size).toBe(1);
        expect(uriCacheService.getData('abc')).toBe(resp);
        expect(uriCacheService.getData('xyz')).toBeUndefined();
    });

    it('should delete item from "cachedData"', () => {
        uriCacheService.setData('abc', resp);
        expect(cachedUData.size).toBe(1);
        uriCacheService.deleteData('abc');
        expect(cachedUData.size).toBe(0);
    });

    it('should clear "cachedData"', () => {
        uriCacheService.setData('abc', resp);
        uriCacheService.setData('xyz', resp);
        expect(cachedUData.size).toBe(2);

        uriCacheService.clearData();
        expect(cachedUData.size).toBe(0);
    });
});
