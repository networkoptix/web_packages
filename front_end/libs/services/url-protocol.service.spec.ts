import { Observable, of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { environment } from '@environments/environment';

import { NxAccountService } from './account.service';
import { NxCloudApiService } from './nx-cloud-api';
import { nxConfig as CONFIG } from './nx-config/config';
import { setupTestBed } from './src/setup';
import { NxUrlProtocolService } from './url-protocol.service';

const clientProtocol = 'test';

const setupUrlProtocolService = async (): Promise<{
    urlService: NxUrlProtocolService;
    clientProtocol: string;
    systemId: string;
    auth: string;
    code: string;
    getCodeSpy: jest.SpyInstance<
        Observable<{
            code: string;
        }>,
        [systemId: string]
    >;
    authKeySpy: jest.SpyInstance<Promise<string>, []>;
}> => {
    const { inject } = await setupTestBed();
    const systemId = uuid();
    const auth = uuid();
    const code = uuid();
    const urlService = inject(NxUrlProtocolService);
    const cloudApiService = inject(NxCloudApiService);
    const accountService = inject(NxAccountService);
    const getCodeSpy = jest.spyOn(cloudApiService, 'getCode').mockReturnValue(of({ code }));
    const authKeySpy = jest.spyOn(accountService, 'authKey').mockReturnValue(Promise.resolve(auth));
    return {
        urlService,
        clientProtocol,
        systemId,
        auth,
        code,
        getCodeSpy,
        authKeySpy,
    };
};

describe('Url Protocol Service', () => {
    let replaced: jest.ReplaceProperty<string>;
    beforeAll(() => {
        replaced = jest.replaceProperty(CONFIG, 'clientProtocol', clientProtocol);
    });
    afterAll(() => {
        replaced.restore();
    });
    it('should create the service', async () => {
        const { urlService } = await setupUrlProtocolService();
        expect(urlService).toBeTruthy();
    });

    it('should generatelink with client protocol', async () => {
        const { urlService, clientProtocol, systemId, auth, code } =
            await setupUrlProtocolService();
        expect(urlService['generateLink'](systemId, auth, code)).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}&code=${code}`,
        );
    });

    it('should use code if OAuth compatible', async () => {
        const { urlService, clientProtocol, systemId, getCodeSpy } =
            await setupUrlProtocolService();
        const { code, link } = await urlService['getLinkOauth'](systemId);
        expect(getCodeSpy).toHaveBeenCalledWith('*');
        expect(link).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?code=${code}`,
        );
    });

    it('should use authKey if OAuth-incompatible', async () => {
        const { urlService, clientProtocol, systemId, auth, authKeySpy } =
            await setupUrlProtocolService();
        const link = await urlService['getLinkLegacy'](systemId);
        expect(authKeySpy).toHaveBeenCalledWith();
        expect(link).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}`,
        );
    });
});
