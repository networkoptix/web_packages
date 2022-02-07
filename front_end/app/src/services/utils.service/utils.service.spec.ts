import { DOCUMENT } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { waitForAsync, TestBed } from '@angular/core/testing';
import { DeviceDetectorService } from 'ngx-device-detector';

import { NxUtilsService } from './utils.service';

describe('NxUtilsService', () => {
    let utilsService: NxUtilsService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxUtilsService,
                DeviceDetectorService,
                { provide: LOCALE_ID, useValue: 'id' },
                { provide: DOCUMENT, useValue: {} }
            ]
        });
        utilsService = TestBed.inject(NxUtilsService);
    }));

    it('should create the service', () => {
        expect(utilsService).toBeTruthy();
    });
});
