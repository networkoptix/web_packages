import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';

import { NxAccountService } from './account.service';
import { NxCloudApiService } from './nx-cloud-api';
import { NxSystemService } from './system.service/system.service';
import { NxVmsClientService } from './vms-client.service';

vi.mock('./account.service', () => ({
    NxAccountService: {},
}));
vi.mock('./system.service/system.service', () => ({
    NxSystemService: {},
}));

const mockProtocol = vi.hoisted(() => 'test');
vi.mock('./nx-config/config', () => ({
    nxConfig: {
        clientProtocol: mockProtocol,
    },
}));

const setupVmsClientService = async (): Promise<{
    clientService: NxVmsClientService;
    systemId: string;
    auth: string;
    code: string;
}> => {
    const systemId = uuid();
    const auth = uuid();
    const code = uuid();
    TestBed.configureTestingModule({
        providers: [
            provideRouter([]),
            MockProvider(NxAccountService, {}),
            MockProvider(NxCloudApiService, {
                getCode: vi.fn(() => of({ code })),
                authKey: vi.fn(() => Promise.resolve({ auth_key: auth })),
            }),
            MockProvider(NxSystemService, {}),
            MockProvider(NxDialogsService),
        ],
    });

    const clientService = TestBed.inject(NxVmsClientService);
    return {
        clientService,
        systemId,
        auth,
        code,
    };
};

describe('VMS Client Service', () => {
    it('should create the service', async () => {
        const { clientService } = await setupVmsClientService();
        expect(clientService).toBeTruthy();
    });

    it('should generatelink with client protocol', async () => {
        const { clientService, systemId, auth, code } = await setupVmsClientService();
        expect(clientService['generateLink'](systemId, auth, code)).toBe(
            `${mockProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}&code=${code}`,
        );
    });

    it('should use code if OAuth compatible', async () => {
        const { clientService, systemId } = await setupVmsClientService();
        const { code, link } = await clientService['getLinkOauth'](systemId);
        expect(clientService['cloudApiService'].getCode).toHaveBeenCalledWith('*');
        expect(link).toBe(
            `${mockProtocol}://${environment.cloudHost}/client/${systemId}/?code=${code}`,
        );
    });

    it('should use authKey if OAuth-incompatible', async () => {
        const { clientService, systemId, auth } = await setupVmsClientService();
        const link = await clientService['getLinkLegacy'](systemId);
        expect(clientService['cloudApiService'].authKey).toHaveBeenCalledWith();
        expect(link).toBe(
            `${mockProtocol}://${environment.cloudHost}/client/${systemId}/?auth=${auth}`,
        );
    });
});
