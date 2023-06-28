import { NxAppStateService } from '@services/nx-app-state.service';

import { setupTestBed } from './src/setup';

const setupAppState = async (): Promise<NxAppStateService> => {
    const { inject } = await setupTestBed();
    return inject(NxAppStateService);
};

describe('AppState Service', () => {
    it('should create the service', async () => {
        const appStateService = await setupAppState();
        expect(appStateService).toBeTruthy();
    });

    it('should have setter and getter (footerVisibility)', async () => {
        const appStateService = await setupAppState();
        appStateService.footerVisibleSubject.subscribe(visible => {
            expect(appStateService.footerVisibility).toBe(visible);
        });

        appStateService.footerVisibility = true;
    });

    it('should have setter and getter (headerVisibility)', async () => {
        const appStateService = await setupAppState();
        appStateService.headerVisibleSubject.subscribe(visible => {
            expect(appStateService.headerVisibility).toBe(visible);
        });

        appStateService.headerVisibility = true;
    });

    it('should have setter and getter (ribbonVisibility)', async () => {
        const appStateService = await setupAppState();
        appStateService.ribbonSubject.subscribe(visible => {
            expect(appStateService.ribbonVisibility).toBe(visible);
        });

        appStateService.ribbonVisibility = true;
    });

    it('should have setter and getter (ready)', async () => {
        const appStateService = await setupAppState();
        appStateService.readySubject.subscribe(visible => {
            expect(appStateService.ready).toBe(visible);
        });

        appStateService.ready = true;
    });

    it('should have setter and getter (canManuallyAccess)', async () => {
        const appStateService = await setupAppState();
        appStateService.manualAccessSubject$.subscribe(canAccess => {
            expect(appStateService.canManuallyAccess).toBe(canAccess);
        });

        appStateService.canManuallyAccess = true;
    });
});
