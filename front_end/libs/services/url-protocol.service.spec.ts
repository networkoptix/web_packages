import { Observable, of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { environment } from '@environments/environment';

import { NxAccountService } from './account.service';
import { NxCloudApiService } from './nx-cloud-api';
import { setupTestBed } from './src/setup';
import { NxUrlProtocolService } from './url-protocol.service';

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
    const clientProtocol = 'test';
    const systemId = uuid();
    const auth = uuid();
    const code = uuid();
    const urlService = inject(NxUrlProtocolService);
    const cloudApiService = inject(NxCloudApiService);
    const accountService = inject(NxAccountService);
    const getCodeSpy = jest.spyOn(cloudApiService, 'getCode').mockReturnValue(of({ code }));
    const authKeySpy = jest.spyOn(accountService, 'authKey').mockReturnValue(Promise.resolve(auth));
    urlService.CONFIG.clientProtocol = clientProtocol;
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
    it('should create the service', async () => {
        const { urlService } = await setupUrlProtocolService();
        expect(urlService).toBeTruthy();
    });

    it('should generatelink with client protocol', async () => {
        const { urlService, clientProtocol, systemId, auth, code } =
            await setupUrlProtocolService();
        expect(urlService.generateLink(systemId, auth, code)).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}&code=${code}`,
        );
    });

    it('should use code if useOauth === true', async () => {
        const { urlService, clientProtocol, systemId, code, getCodeSpy } =
            await setupUrlProtocolService();
        const link = await urlService.getLink(systemId, true);
        expect(getCodeSpy).toHaveBeenCalledWith('*');
        expect(link).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?code=${code}`,
        );
    });

    it('should use authKey if useOauth is falsy', async () => {
        const { urlService, clientProtocol, systemId, auth, authKeySpy } =
            await setupUrlProtocolService();
        const link = await urlService.getLink(systemId, false);
        expect(authKeySpy).toHaveBeenCalledWith();
        expect(link).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}`,
        );
    });
});
