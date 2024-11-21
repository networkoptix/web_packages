import * as generalUtils from './general';
import * as nxUtils from './nx';
import { parseJWTToken } from './token-tools';

describe('General purpose utils', () => {
    describe('cleanIdLegacy', () => {
        it('should clean up id', () => {
            expect(generalUtils.cleanIdLegacy('{1ba9a833-0885-9649-8f1f-8400edf48868}')).toBe(
                '1ba9a833-0885-9649-8f1f-8400edf48868',
            );
        });

        it('should return the same id', () => {
            expect(generalUtils.cleanIdLegacy('1ba9a833-0885-9649-8f1f-8400edf48868')).toBe(
                '1ba9a833-0885-9649-8f1f-8400edf48868',
            );
        });
    });

    describe('dirtyId', () => {
        it('should clean up id', () => {
            expect(generalUtils.dirtyId('1ba9a833-0885-9649-8f1f-8400edf48868')).toBe(
                '{1ba9a833-0885-9649-8f1f-8400edf48868}',
            );
        });

        it('should return the same id', () => {
            expect(generalUtils.dirtyId('{1ba9a833-0885-9649-8f1f-8400edf48868}')).toBe(
                '{1ba9a833-0885-9649-8f1f-8400edf48868}',
            );
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
        expect(generalUtils.cleanSmbUrl('admin:password@smb:/server/share/mediaserver/data')).toBe(
            'server/share/mediaserver/data',
        );
        expect(generalUtils.cleanSmbUrl('smb:/server/share/mediaserver/data')).toBe(
            'server/share/mediaserver/data',
        );
    });

    it('should return modulus', () => {
        expect(generalUtils.mod(10, 3)).toBe(1);
    });

    it('should splice a string', () => {
        expect(generalUtils.strSplice('To be', 2, ' be or not to')).toBe('To be or not to be');
    });
});

describe('Nx utils', () => {
    it('should set ipv4 ip/port if any exists', () => {
        const mockServer = {
            endpoints: [
                '10.1.5.210:7001',
                '[fe80::5a88:4ce4:a105:fdb0%3]:7001',
                '47.44.180.186:7001',
            ],
        };
        const expectedReturnedServer = {
            ...mockServer,
            ip: '10.1.5.210',
            port: '7001',
        };
        expect(nxUtils.setServerIpAndPort(mockServer)).toEqual(expectedReturnedServer);
    });

    it('should set ipv6 ip/port if only ipv6 exists', () => {
        const mockServer = {
            endpoints: ['[fe80::5a88:4ce4:a105:fdb0%3]:7001'],
        };
        const expectedReturnedServer = {
            ...mockServer,
            ip: 'fe80::5a88:4ce4:a105:fdb0%3',
            port: '7001',
        };
        expect(nxUtils.setServerIpAndPort(mockServer)).toEqual(expectedReturnedServer);
    });

    it('should set ip to N/A if none exists', () => {
        const mockServer = {
            endpoints: [],
        };
        const expectedReturnedServer = {
            ...mockServer,
            ip: 'N/A',
            port: '',
        };
        expect(nxUtils.setServerIpAndPort(mockServer)).toEqual(expectedReturnedServer);
    });
});

describe('JWT token parsing', () => {
    it('should parse token', () => {
        const token =
            'nxcdb-eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImE4NDRiODczLWE3OTYtNGVjNy1iMzEzLTZkOWEzYTY1ZGM0YiJ9.eyJleHAiOjE3MjQ4Nzk2MjcsInB3ZFRpbWUiOjE3MjQ4Nzg5MDYsInNpZCI6IjcxYzJiMWE1LTRlNzAtNDYzZS1hNmQ5LTAzZjg3Y2RiZmZiYSIsInR5cCI6ImFjY2Vzc1Rva2VuIiwiYXVkIjoiaHR0cHM6Ly9xYS5jbG91ZC5oZHcubXgvIGNsb3VkU3lzdGVtSWQ9KiIsImlhdCI6MTcyNDg3ODkwNywic3ViIjoia3N0YXBsZXJAbmV0d29ya29wdGl4LmNvbSIsImNsaWVudF9pZCI6IiIsImlzcyI6ImNkYiJ9.cZJ1DXkEeGTUTTR-HQzjxRp_t61lXsIyRbShlEZCeO83gccibNMv4EySY4XBR8aSeqUoY_BabUKJhaZIrPXYaMClxuDFeH_M7kAts1NS8K8Wav4Cf_AiF7n7uPyPclE-zfMiddOcprtJSGNcAiZSFKmjkZxA-3OtOMxEusdewOSzNh0z5hPaKq82-4BKLV92NSpieOBFK9bhah2XWZrcPr2DH-d10a27IsWHGDue5I1i-lsNhd_Xx_MZeKfmM4-kUAY5mKKVvrZZrI9BhQr8dWWQ6Y29y7v09r3okFgFlYIrDXXJwzjycc1ZUVa3kdew7WD93swqotOZTgKHeGxiew';
        const expectedToken = {
            tokenType: 'JWT',
            algorithm: 'RS256',
            keyId: 'a844b873-a796-4ec7-b313-6d9a3a65dc4b',
            audience: 'https://qa.cloud.hdw.mx/ cloudSystemId=*',
            clientId: '',
            expiration: 1724879627,
            issuedAt: 1724878907,
            issuer: 'cdb',
            passwordTime: 1724878906,
            sessionId: '71c2b1a5-4e70-463e-a6d9-03f87cdbffba',
            email: 'kstapler@networkoptix.com',
            jwtId: undefined,
            type: 'accessToken',
        };
        expect(parseJWTToken(token)).toEqual(expectedToken);
    });
    it('should parse Code', () => {
        const code =
            'nxcdb-eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6ImE4NDRiODczLWE3OTYtNGVjNy1iMzEzLTZkOWEzYTY1ZGM0YiJ9.eyJleHAiOjE3MjQ4NzkwODYsInB3ZFRpbWUiOjE3MjQ4Nzg5MDYsInNpZCI6IjcxYzJiMWE1LTRlNzAtNDYzZS1hNmQ5LTAzZjg3Y2RiZmZiYSIsInR5cCI6ImF1dGhDb2RlIiwiYXVkIjoiaHR0cHM6Ly9xYS5jbG91ZC5oZHcubXgvIGNsb3VkU3lzdGVtSWQ9KiIsImlhdCI6MTcyNDg3ODkwNiwic3ViIjoia3N0YXBsZXJAbmV0d29ya29wdGl4LmNvbSIsImNsaWVudF9pZCI6ImNsb3VkL2RlZmF1bHQiLCJpc3MiOiJjZGIifQ.mYYuBG8sA8PESf_ATDNRiXdldCgQmWEkFNdYqM7Om024Ky0PjMlliszrrBdMSgnyGfsIydTWnW_Z-tigiWxnKd9u12OSmomQL6GWpxriY73MS8ZgSDPJ6ymWrCO3gC6-TX30Do0x7_XQQnvFAGgRct7vOG86hF-agN7fIKtvGCb9iCZ4CQzhbnfyEpPRE616tp4sq-e6Fm2m94yRpBZdpWApBcEBa3hifGAdV32oLU-X9n3IeF16GeGtfKP9Sk3zC565nXl3hJ1OFI-D05DjUTe9CIaO9u2GzrHbwrPEhBfz-jtyRo6DBFJFH0dPDsKc9AvRIWd_lBjU2SoYHThU9Q';
        const expectedCode = {
            tokenType: 'JWT',
            algorithm: 'RS256',
            keyId: 'a844b873-a796-4ec7-b313-6d9a3a65dc4b',
            audience: 'https://qa.cloud.hdw.mx/ cloudSystemId=*',
            clientId: 'cloud/default',
            expiration: 1724879086,
            issuedAt: 1724878906,
            issuer: 'cdb',
            passwordTime: 1724878906,
            sessionId: '71c2b1a5-4e70-463e-a6d9-03f87cdbffba',
            email: 'kstapler@networkoptix.com',
            jwtId: undefined,
            type: 'authCode',
        };
        expect(parseJWTToken(code)).toEqual(expectedCode);
    });
});
