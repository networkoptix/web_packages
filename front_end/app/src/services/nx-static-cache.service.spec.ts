import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxStaticCacheService } from '@services/nx-static-cache';

describe('Static cache service', () => {
    let cacheService: NxStaticCacheService;
    const configMock = { getConfig: () => nxConfig };
    let httpClientSpy: { get: jasmine.Spy };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                HttpClient,
                { provide: NxConfigService, useValue: configMock }
            ]
        });
        cacheService = TestBed.inject(NxStaticCacheService);
    }));

    it('should create the service', () => {
        expect(cacheService).toBeTruthy();
    });

    it('should fetch item form cache or request and put it into cache', () => {
        httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
        httpClientSpy.get.and.returnValue(of()
            .pipe(shareReplay({ bufferSize: 1, refCount: true })));

        const expectedHTML = cacheService.requestStatic('test');

        expect(expectedHTML).toBeTruthy();
        expect(cacheService.cache['test']).toBeTruthy();
    });
});
