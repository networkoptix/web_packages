import type {
    NxSystemServer
} from '@services/system.service/system/system-types';

import * as generalUtils from './general';
import * as nxUtils from './nx';

describe('General purpose utils', () => {
    it('should clean up id', () => {
        expect(generalUtils.cleanId('{1ba9a833-0885-9649-8f1f-8400edf48868}'))
            .toBe('1ba9a833-0885-9649-8f1f-8400edf48868');
    });

    it('should show ipv6 address as truthy', () => {
        expect(generalUtils.cleanIp('fe80::5a88:4ce4:a105:fdb0%3')).toBeTruthy();
    });

    it('should return ipv4 address as is', () => {
        expect(generalUtils.cleanIp('10.1.5.210')).toBe('10.1.5.210');
    });

    it('should remove port from ipv4 address', () => {
        expect(generalUtils.cleanIp('10.1.5.210:7001')).toBe('10.1.5.210');
    });

    it('should clean up smb url', () => {
        expect(generalUtils.cleanSmbUrl(
            'admin:password@smb:/server/share/mediaserver/data'
        )).toBe('server/share/mediaserver/data');
        expect(generalUtils.cleanSmbUrl('smb:/server/share/mediaserver/data'))
            .toBe('server/share/mediaserver/data');
    });

    it('should return modulus', () => {
        expect(generalUtils.mod(10, 3)).toBe(1);
    });

    it('should return true if a number', () => {
        expect(generalUtils.isNumber(1)).toBe(true);
        expect(generalUtils.isNumber(0)).toBe(true);
        expect(generalUtils.isNumber(10000000000)).toBe(true);
        expect(generalUtils.isNumber(9007199254740992)).toBe(true); // not safe number
        expect(generalUtils.isNumber(-1)).toBe(true);
    });

    it('should return false if not a number', () => {
        expect(generalUtils.isNumber('')).toBe(false);
        expect(generalUtils.isNumber('string')).toBe(false);
        expect(generalUtils.isNumber(true)).toBe(false);
        expect(generalUtils.isNumber(undefined)).toBe(false);
        expect(generalUtils.isNumber(null)).toBe(false);
        expect(generalUtils.isNumber({})).toBe(false);
        expect(generalUtils.isNumber([])).toBe(false);
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
        expect(generalUtils.isEqual(obj1, obj2)).toBe(true);
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
        expect(generalUtils.isEqual(obj1, obj2)).toBe(false);
    });

    it('should return exact object', () => {
        const obj = {
            a: '1',
            c: {
                2: 2
            }
        };
        expect(generalUtils.deepCopy(obj)).toEqual(obj);
    });
});

describe('Nx utils', () => {
    it('should set ipv4 ip/port if any exists', () => {
        const mockServer = {
            networkAddresses: '10.1.5.210:7001;[fe80::5a88:4ce4:a105:fdb0%3]:7001;47.44.180.186:7001'
        };
        const expectedReturnedServer = {
            networkAddresses: '10.1.5.210:7001;[fe80::5a88:4ce4:a105:fdb0%3]:7001;47.44.180.186:7001',
            ip: '10.1.5.210',
            port: '7001'
        };
        expect(nxUtils.setServerIpAndPort(mockServer as NxSystemServer))
            .toEqual(expectedReturnedServer as NxSystemServer);
    });

    it('should set ipv6 ip/port if only ipv6 exists', () => {
        const mockServer = {
            networkAddresses: '[fe80::5a88:4ce4:a105:fdb0%3]:7001'
        };
        const expectedReturnedServer = {
            networkAddresses: '[fe80::5a88:4ce4:a105:fdb0%3]:7001',
            ip: 'fe80::5a88:4ce4:a105:fdb0%3',
            port: '7001'
        };
        expect(nxUtils.setServerIpAndPort(mockServer as NxSystemServer))
            .toEqual(expectedReturnedServer as NxSystemServer);
    });

    it('should set ip to N/A if none exists', () => {
        const mockServer = {
            networkAddresses: ''
        };
        const expectedReturnedServer = {
            networkAddresses: '',
            ip: 'N/A',
            port: ''
        };
        expect(nxUtils.setServerIpAndPort(mockServer as NxSystemServer))
            .toEqual(expectedReturnedServer as NxSystemServer);
    });
});
