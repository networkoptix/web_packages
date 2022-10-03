import { waitForAsync, TestBed } from '@angular/core/testing';

import { NxAppStateService } from '@services/nx-app-state.service';

describe('AppState Service', () => {
    let appStateService: NxAppStateService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxAppStateService
            ]
        });
        appStateService = TestBed.inject(NxAppStateService);
    }));

    it('should create the service', () => {
        expect(appStateService).toBeTruthy();
    });

    it('should have setter and getter (footerVisibility)', () => {
        appStateService.footerVisibleSubject.subscribe((visible) => {
            expect(appStateService.footerVisibility).toBe(visible);
        });

        appStateService.footerVisibility = true;
    });

    it('should have setter and getter (headerVisibility)', () => {
        appStateService.headerVisibleSubject.subscribe((visible) => {
            expect(appStateService.headerVisibility).toBe(visible);
        });

        appStateService.headerVisibility = true;
    });

    it('should have setter and getter (ribbonVisibility)', () => {
        appStateService.ribbonSubject.subscribe((visible) => {
            expect(appStateService.ribbonVisibility).toBe(visible);
        });

        appStateService.ribbonVisibility = true;
    });

    it('should have setter and getter (ready)', () => {
        appStateService.readySubject.subscribe((visible) => {
            expect(appStateService.ready).toBe(visible);
        });

        appStateService.ready = true;
    });

    it('should have setter and getter (canManuallyAccess)', () => {
        appStateService.manualAccessSubject$.subscribe((canAccess) => {
            expect(appStateService.canManuallyAccess).toBe(canAccess);
        });

        appStateService.canManuallyAccess = true;
    });
});
