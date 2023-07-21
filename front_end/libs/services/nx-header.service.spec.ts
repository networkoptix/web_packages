import { headerNodes } from '@mocks/nodesMock';
import { setupTest41System } from '@mocks/system.test';
import { NxHeaderService } from '@services/nx-header.service';

import { setupTestBed } from './src/setup';

const setupHeader = async (): Promise<NxHeaderService> => {
    const { inject } = await setupTestBed();
    return inject(NxHeaderService);
};

describe('Nx Header Service', () => {
    it('should create the service', async () => {
        const headerService = await setupHeader();
        expect(headerService).toBeTruthy();
    });

    it('should have setter and getter (currentLocation)', async () => {
        const headerService = await setupHeader();
        const value = { isSystem: false };
        headerService.currentLocation = value;

        headerService.currentLocation$.subscribe(() => {
            expect(headerService.currentLocation).toEqual(value);
        });
    });

    it('should have setter and getter (createAccountButtonType)', async () => {
        const headerService = await setupHeader();
        expect(headerService.createAccountButtonType).toBe('primary');
        headerService.createAccountButtonType = 'default';

        expect(headerService.createAccountButtonType).toBe('default');
    });

    it('should have setter and getter (show$)', async () => {
        const headerService = await setupHeader();
        expect(headerService.show$).toBeFalsy();
        headerService.show$ = true;

        expect(headerService.show$).toBeTruthy();
    });

    it('should have setter and getter (activeSystem)', async () => {
        const headerService = await setupHeader();
        expect(headerService.activeSystem).toBeNull();
        headerService.activeSystem = undefined;

        expect(headerService.activeSystem).toBeUndefined();
        expect(headerService.lastActive).toBeNull();
    });

    it('should set active system)', async () => {
        const headerService = await setupHeader();
        const systemMock = setupTest41System();
        expect(headerService.activeSystem).toBeNull();
        headerService.activeSystem = systemMock as typeof headerService.activeSystem;

        expect(headerService.activeSystem).toEqual(systemMock);
        expect(headerService.lastActive).toEqual(systemMock);
    });

    it('should set location (/)', async () => {
        const headerService = await setupHeader();
        headerService.setLocation('/');
        expect(headerService.currentLocation).toEqual({ isSystem: false });
    });

    it('should set location (/systems)', async () => {
        const headerService = await setupHeader();
        headerService.setLocation('/systems');
        expect(headerService.currentLocation).toEqual({
            isSystem: true,
            parentNode: undefined,
            path: '/systems',
        });
    });

    it('should set location (/download)', async () => {
        const headerService = await setupHeader();
        headerService.nodes = headerNodes;
        headerService.setLocation('/download');
        expect(headerService.currentLocation.assetId).toBeNull();
        expect(headerService.currentLocation.breadcrumbs.length).toBe(0);
        expect(headerService.currentLocation.isSystem).toBeFalsy();
        expect(headerService.currentLocation.childNode).toBeDefined();
        expect(headerService.currentLocation.parentNode).toBeDefined();
        expect(headerService.currentLocation.path).toBe('/download');
    });
});
