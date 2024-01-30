import { Observable, of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { environment } from '@environments/environment';

import { NxCloudApiService } from './nx-cloud-api';
import { nxConfig as CONFIG } from './nx-config/config';
import { setupTestBed } from './src/setup';
import { NxVmsClientService } from './vms-client.service';

const clientProtocol = 'test';

const setupVmsClientService = async (): Promise<{
    clientService: NxVmsClientService;
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
    authKeySpy: jest.SpyInstance<Promise<{ auth_key: string }>, []>;
}> => {
    const { inject } = await setupTestBed();
    const systemId = uuid();
    const auth = uuid();
    const code = uuid();
    const clientService = inject(NxVmsClientService);
    const cloudApiService = inject(NxCloudApiService);
    const getCodeSpy = jest.spyOn(cloudApiService, 'getCode').mockReturnValue(of({ code }));
    const authKeySpy = jest
        .spyOn(cloudApiService, 'authKey')
        .mockReturnValue(Promise.resolve({ auth_key: auth }));
    return {
        clientService,
        clientProtocol,
        systemId,
        auth,
        code,
        getCodeSpy,
        authKeySpy,
    };
};

describe('VMS Client Service', () => {
    let replaced: jest.ReplaceProperty<string>;
    beforeAll(() => {
        replaced = jest.replaceProperty(CONFIG, 'clientProtocol', clientProtocol);
    });
    afterAll(() => {
        replaced.restore();
    });
    it('should create the service', async () => {
        const { clientService: urlService } = await setupVmsClientService();
        expect(urlService).toBeTruthy();
    });

    it('should generatelink with client protocol', async () => {
        const { clientService, clientProtocol, systemId, auth, code } =
            await setupVmsClientService();
        expect(clientService['generateLink'](systemId, auth, code)).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}&code=${code}`,
        );
    });

    it('should use code if OAuth compatible', async () => {
        const { clientService, clientProtocol, systemId, getCodeSpy } =
            await setupVmsClientService();
        const { code, link } = await clientService['getLinkOauth'](systemId);
        expect(getCodeSpy).toHaveBeenCalledWith('*');
        expect(link).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?code=${code}`,
        );
    });

    it('should use authKey if OAuth-incompatible', async () => {
        const { clientService, clientProtocol, systemId, auth, authKeySpy } =
            await setupVmsClientService();
        const link = await clientService['getLinkLegacy'](systemId);
        expect(authKeySpy).toHaveBeenCalledWith();
        expect(link).toBe(
            `${clientProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}`,
        );
    });
});
