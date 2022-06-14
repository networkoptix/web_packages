import { waitForAsync, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxAccountService } from './account.service';
import { NxCloudApiService } from './nx-cloud-api';
import { NxUrlProtocolService } from './url-protocol.service';
import { WINDOW } from './window-provider';

describe('Url Protocol Service', () => {
    let urlService: NxUrlProtocolService;
    const translateMock = {
        translations: {
            clientProtocol: undefined
        }
    };
    const configMock = { getConfig: () => nxConfig };
    const windowMock = {
        location: {
            host: 'localhost:7001',
            protocol: 'http:'
        }
    };
    const cloudMock = {
        getCode: () => of({ code: 'someCode' })
    };
    const accountMock = {
        authKey: () => Promise.resolve('someAuth')
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [
                NxUrlProtocolService,
                { provide: WINDOW, useValue: windowMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxAccountService, useValue: accountMock },
                { provide: NxCloudApiService, useValue: cloudMock }
            ]
        });
        urlService = TestBed.inject(NxUrlProtocolService);
    }));

    it('should create the component', () => {
        expect(urlService).toBeTruthy();
    });

    it('should get default generateLink without client protocol', () => {
        expect(urlService.generateLink()).toBe('http://localhost:7001/client/?from=portal');
    });

    it('should generatelink with client protocol', () => {
        urlService.LANG.clientProtocol = () => 'https:';
        expect(urlService.generateLink()).toBe('https://localhost:7001/client/?from=portal');
    });

    it('should attach params if they exist', () => {
        const linkSettings = {
            from: 'client',
            auth: 'authString',
            context: 'someContext',
            code: 'someCode'
        };
        expect(urlService.generateLink(linkSettings))
            .toBe('https://localhost:7001/client/?from=client&auth=authString&context=someContext&code=someCode');
    });

    it('should attach systemId and action if they exist', () => {
        const linkSettings = {
            systemId: 'systemId',
            action: 'actionString'
        };
        expect(urlService.generateLink(linkSettings))
            .toBe('https://localhost:7001/client/systemId/actionString?from=portal');
    });

    it('should use code if useOauth === true', async () => {
        const linkData = await urlService.getLink({ useOauth: true });
        expect(linkData.link).toBe('https://localhost:7001/client/?from=portal&code=someCode');
        expect(linkData.code).toBe('someCode');
        expect(linkData.authKey).toBeUndefined();
    });

    it('should use authKey if useOauth is falsy', async () => {
        const linkData = await urlService.getLink({});
        expect(linkData.link).toBe('https://localhost:7001/client/?from=portal&auth=someAuth&code=someCode');
        expect(linkData.code).toBe('someCode');
        expect(linkData.authKey).toEqual('someAuth');
    });
});
