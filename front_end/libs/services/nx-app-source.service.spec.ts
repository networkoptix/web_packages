import { setupTest41System } from '@mocks/system.test';
import { NxAppSourceService } from '@services/nx-app-source.service';
import { menus } from '@variables/static-variables';

import { setupTestBed } from './src/setup';

const setupAppSource = async (): Promise<{
    appSourceService: NxAppSourceService;
    systemMock: ReturnType<typeof setupTest41System>;
}> => {
    const { inject } = await setupTestBed();
    const systemMock = setupTest41System();
    const appSourceService = inject(NxAppSourceService);
    return {
        appSourceService,
        systemMock,
    };
};

describe('AppSource Service', () => {
    it('should create the service', async () => {
        const { appSourceService } = await setupAppSource();
        expect(appSourceService).toBeTruthy();
    });

    it('should return baseUrl if cloud', async () => {
        const { appSourceService, systemMock } = await setupAppSource();
        const base = `${menus.systemSettings.baseUrl}${systemMock.id}${menus.systemHealth.baseUrl}`;
        const url = appSourceService.getMenuBase(systemMock);
        expect(url).toBe(base);
    });

    it('should return baseUrl if local', async () => {
        const { appSourceService, systemMock } = await setupAppSource();
        Object.defineProperty(appSourceService, 'environment', {
            value: { ...appSourceService.environment, isWebadmin: true },
        });
        const base = `${menus.systemHealth.baseUrl}`;
        const url = appSourceService.getMenuBase(systemMock);
        expect(url).toBe(base);
    });
});
