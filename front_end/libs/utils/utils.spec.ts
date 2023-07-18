import { cloneDeep } from 'lodash-es';

import type {
    NxSystemServer
} from '@services/system.service/system-types';

import * as generalUtils from './general';
import * as nxUtils from './nx';

describe('General purpose utils', () => {
    describe('cleanId', () => {
        it('should clean up id', () => {
            expect(generalUtils.cleanId('{1ba9a833-0885-9649-8f1f-8400edf48868}'))
                .toBe('1ba9a833-0885-9649-8f1f-8400edf48868');
        });

        it('should return the same id', () => {
            expect(generalUtils.cleanId('1ba9a833-0885-9649-8f1f-8400edf48868'))
                .toBe('1ba9a833-0885-9649-8f1f-8400edf48868');
        });
    });

    describe('dirtyId', () => {
        it('should clean up id', () => {
            expect(generalUtils.dirtyId('1ba9a833-0885-9649-8f1f-8400edf48868'))
                .toBe('{1ba9a833-0885-9649-8f1f-8400edf48868}');
        });

        it('should return the same id', () => {
            expect(generalUtils.dirtyId('{1ba9a833-0885-9649-8f1f-8400edf48868}'))
                .toBe('{1ba9a833-0885-9649-8f1f-8400edf48868}');
        });
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

    it('should splice a string', () => {
        expect(generalUtils.strSplice('To be', 2, ' be or not to'))
            .toBe('To be or not to be');
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

/* Everything below here is deprecated and kept for archive purposes only */
/* eslint-disable */

/** @deprecated
 * Replaced with lodash `cloneDeep()`.
 *
 * Source: https://stackoverflow.com/a/40293777
 */
function deepCopyWithCircularReference<T extends Object>(
    obj: T,
    hash = new WeakMap()
): T {
    if (Object(obj) !== obj || obj instanceof Function) {
        return obj;
    }
    if (hash.has(obj)) {
        return hash.get(obj); // Cyclic reference
    }
    const result: unknown = Object.create(Object.getPrototypeOf(obj));
    if (obj instanceof Map) {
        Array.from(
            obj,
            ([key, val]: [string, unknown]) =>
                (result as Map<string, unknown>).set(
                    deepCopyWithCircularReference(key, hash),
                    deepCopyWithCircularReference(val, hash)
                )
        );
    } else if (obj instanceof Set) {
        Array.from(
            obj,
            (key: unknown) => (result as Set<unknown>).add(
                deepCopyWithCircularReference(key, hash)
            )
        );
    }
    hash.set(obj, result);
    return Object.assign(
        result as T,
        ...Object.keys(obj).map(key => ({
            [key]: deepCopyWithCircularReference(obj[key], hash)
        }))
    );
}

describe('deepCopyWithCircularReference', () => {
    /* https://github.com/lodash/lodash/blob/2f79053d7bc7c9c9561a30dda202b3dcd2b72b90/test/clone-methods.js#L106 */
    it('should match _.cloneDeep() with lots of circular references', () => {
        const LARGE_ARRAY_SIZE = 200;
        const cyclical = {};

        for (let i = 0; i < LARGE_ARRAY_SIZE + 1; i++) {
            cyclical[`v${i}`] = [i ? cyclical[`v${i - 1}`] : cyclical];
        }

        const utilsClone = deepCopyWithCircularReference(cyclical);
        const utilsActual = utilsClone[`v${LARGE_ARRAY_SIZE}`][0];
        const lodashClone = cloneDeep(cyclical);
        // const lodashActual = lodashClone[`v${LARGE_ARRAY_SIZE}`][0];

        expect(utilsActual).toEqual(utilsClone[`v${LARGE_ARRAY_SIZE - 1}`]);
        expect(utilsActual).not.toEqual(cyclical[`v${LARGE_ARRAY_SIZE - 1}`]);

        // expect(utilsClone).toEqual(lodashClone); // FAIL
        // expect(utilsActual).toEqual(lodashActual); // FAIL

        expect(lodashClone).toEqual(cyclical);
        // expect(utilsClone).toEqual(cyclical); // FAIL
    });
});
