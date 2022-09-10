import { waitForAsync, TestBed } from '@angular/core/testing';

import { setupTest41System } from '@app/_mocks/system.test';
import { NxAppSourceService } from '@services/nx-app-source.service';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

describe('AppSource Service', () => {
    let appSourceService: NxAppSourceService;

    const configMock = { getConfig: () => nxConfig };
    const systemMock = setupTest41System();

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxAppSourceService,
                { provide: NxConfigService, useValue: configMock }
            ]
        });
        appSourceService = TestBed.inject(NxAppSourceService);
        appSourceService['CONFIG'] = configMock.getConfig();
    }));

    it('should create the service', () => {
        expect(appSourceService).toBeTruthy();
    });

    it('should return baseUrl if cloud', () => {
        const base = `${appSourceService['CONFIG'].menus.systemSettings.baseUrl}${systemMock.id}${appSourceService['CONFIG'].menus.systemHealth.baseUrl}`;
        const url = appSourceService.getMenuBase(systemMock);
        expect(url).toBe(base);
    });

    it('should return baseUrl if local', () => {
        Object.defineProperty(
            appSourceService,
            'environment',
            { value: { ...appSourceService.environment, isLocal: true } }
        );
        const base = `${appSourceService['CONFIG'].menus.systemHealth.baseUrl}`;
        const url = appSourceService.getMenuBase(systemMock);
        expect(url).toBe(base);
    });
});
