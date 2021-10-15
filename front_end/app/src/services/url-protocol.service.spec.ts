import { waitForAsync, TestBed } from '@angular/core/testing';
import { of }                    from 'rxjs';

import { NxUrlProtocolService }      from './url-protocol.service';
import { NxConfigService }           from '@services/nx-config';
import { nxConfig }                  from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { WINDOW }                    from './window-provider';
import { NxAccountService }          from './account.service';
import { NxCloudApiService }         from './nx-cloud-api';

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
        getAccessCode: () => of({ access_code: 'someCode' })
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
            access_code: 'someCode'
        };
        expect(urlService.generateLink(linkSettings))
            .toBe('https://localhost:7001/client/?from=client&auth=authString&context=someContext&access_code=someCode');
    });

    it('should attach systemId and action if they exist', () => {
        const linkSettings = {
            systemId: 'systemId',
            action: 'actionString'
        };
        expect(urlService.generateLink(linkSettings))
            .toBe('https://localhost:7001/client/systemId/actionString?from=portal');
    });

    it('should use access_code if useOauth === true', async () => {
        const linkData = await urlService.getLink({ useOauth: true });
        expect(linkData.link).toBe('https://localhost:7001/client/?from=portal&access_code=someCode');
        expect(linkData.access_code).toBe('someCode');
        expect(linkData.authKey).toBeUndefined();
    });

    it('should use authKey if useOauth is falsy', async () => {
        const linkData = await urlService.getLink({});
        expect(linkData.link).toBe('https://localhost:7001/client/?from=portal&auth=someAuth');
        expect(linkData.access_code).toBeUndefined();
        expect(linkData.authKey).toEqual('someAuth');
    });
});
