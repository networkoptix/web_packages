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

    it('should clean up id', () => {
        expect(NxUtilsService.cleanId('{1ba9a833-0885-9649-8f1f-8400edf48868}')).toBe('1ba9a833-0885-9649-8f1f-8400edf48868');
    });

    it('should show ipv6 address as truthy', () => {
        expect(NxUtilsService.cleanIp('fe80::5a88:4ce4:a105:fdb0%3')).toBeTruthy();
    });

    it('should return ipv4 address as is', () => {
        expect(NxUtilsService.cleanIp('10.1.5.210')).toBe('10.1.5.210');
    });

    it('should remove port from ipv4 address', () => {
        expect(NxUtilsService.cleanIp('10.1.5.210:7001')).toBe('10.1.5.210');
    });

    it('should be equal with identical deeply nested objects', () => {
        const obj1 = {
            a: '1',
            b: 2,
            c: {
                1: 'one',
                2: 2
            }
        };
        const obj2 = {
            a: '1',
            b: 2,
            c: {
                1: 'one',
                2: 2
            }
        };
        expect(NxUtilsService.isEqual(obj1, obj2)).toBe(true);
    });

    it('should not be equal with different deeply nested objects', () => {
        const obj1 = {
            a: '1',
            b: 2,
            c: {
                1: 'one',
                2: 2
            }
        };
        const obj2 = {
            a: '1',
            b: 2,
            c: {
                1: 'one',
                2: 3
            }
        };
        expect(NxUtilsService.isEqual(obj1, obj2)).toBe(false);
    });

    it('should return exact object', () => {
        const obj = {
            a: '1',
            c: {
                2: 2
            }
        };
        expect(NxUtilsService.deepCopy(obj)).toEqual(obj);
    });

    it('should return modulus', () => {
        expect(NxUtilsService.mod(10, 3)).toBe(1);
    });

    it('should show isTablet is false', () => {
        expect(utilsService.isTablet()).toBe(false);
    });

    it('should show isMobile is false', () => {
        expect(utilsService.isTablet()).toBe(false);
    });

    it('should return ipv4 ip/port if any exists', () => {
        const mockServer = {
            networkAddresses: '10.1.5.210:7001;[fe80::5a88:4ce4:a105:fdb0%3]:7001;47.44.180.186:7001'
        };
        const expectedReturnedServer = {
            networkAddresses: '10.1.5.210:7001;[fe80::5a88:4ce4:a105:fdb0%3]:7001;47.44.180.186:7001',
            ip: '10.1.5.210',
            port: '7001'
        };
        expect(NxUtilsService.formatURL(mockServer)).toEqual(expectedReturnedServer);
    });

    it('should return ipv6 ip/port if only ipv6 exists', () => {
        const mockServer = {
            networkAddresses: '[fe80::5a88:4ce4:a105:fdb0%3]:7001'
        };
        const expectedReturnedServer = {
            networkAddresses: '[fe80::5a88:4ce4:a105:fdb0%3]:7001',
            ip: 'fe80::5a88:4ce4:a105:fdb0%3',
            port: '7001'
        };
        expect(NxUtilsService.formatURL(mockServer)).toEqual(expectedReturnedServer);
    });

    it('should return N/A if none exists', () => {
        const mockServer = {
            networkAddresses: ''
        };
        const expectedReturnedServer = {
            networkAddresses: '',
            ip: 'N/A',
            port: ''
        };
        expect(NxUtilsService.formatURL(mockServer)).toEqual(expectedReturnedServer);
    });

    it('should return true if a number', () => {
        expect(NxUtilsService.isNumber(1)).toBe(true);
        expect(NxUtilsService.isNumber(0)).toBe(true);
        expect(NxUtilsService.isNumber(10000000000)).toBe(true);
        expect(NxUtilsService.isNumber(9007199254740992)).toBe(true); // not safe number
        expect(NxUtilsService.isNumber(-1)).toBe(true);
    });

    it('should return false if not a number', () => {
        expect(NxUtilsService.isNumber('')).toBe(false);
        expect(NxUtilsService.isNumber('string')).toBe(false);
        expect(NxUtilsService.isNumber(true)).toBe(false);
        expect(NxUtilsService.isNumber(undefined)).toBe(false);
        expect(NxUtilsService.isNumber(null)).toBe(false);
        expect(NxUtilsService.isNumber({})).toBe(false);
        expect(NxUtilsService.isNumber([])).toBe(false);
    });

    it('should clean up smb url', () => {
        expect(NxUtilsService.cleanSmbUrl('admin:password@smb:/server/share/mediaserver/data')).toBe('server/share/mediaserver/data');
        expect(NxUtilsService.cleanSmbUrl('smb:/server/share/mediaserver/data')).toBe('server/share/mediaserver/data');
    });
});
