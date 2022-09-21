import { waitForAsync, TestBed } from '@angular/core/testing';
import { Router, RouterEvent } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, ReplaySubject } from 'rxjs';

import { headerNodes } from '@app/_mocks/nodesMock';
import { setupTest41System } from '@app/_mocks/system.test';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxHeaderService } from '@services/nx-header.service';
import { WINDOW } from '@services/window-provider';

const eventSubject = new ReplaySubject<RouterEvent>(1);
const routerMock = {
    navigate: jasmine.createSpy('navigate'),
    events: eventSubject.asObservable(),
    url: '/systems'
};

const menuMock = {
    currentSystemNode$: new BehaviorSubject<MenuNode>(null)
};

describe('Nx Header Service', () => {
    let headerService: NxHeaderService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxHeaderService,
                { provide: NxMenusService, useValue: menuMock },
                { provide: Router, useValue: routerMock },
                MockProvider(WINDOW),
            ]
        });
        headerService = TestBed.inject(NxHeaderService);
    }));

    it('should create the service', () => {
        expect(headerService).toBeTruthy();
    });

    it('should have setter and getter (currentLocation)', () => {
        const value = { isSystem: false };
        headerService.currentLocation = value;

        headerService.currentLocation$.subscribe(() => {
            expect(headerService.currentLocation).toEqual(value);
        });
    });

    it('should have setter and getter (createAccountButtonType)', () => {
        expect(headerService.createAccountButtonType).toBe('primary');
        headerService.createAccountButtonType = 'default';

        headerService.createAccountButtonType$.subscribe(() => {
            expect(headerService.createAccountButtonType).toBe('default');
        });
    });

    it('should have setter and getter (show$)', () => {
        expect(headerService.show$).toBeFalse();
        headerService.show$ = true;

        headerService.showSubject.subscribe(() => {
            expect(headerService.show$).toBeTrue();
        });
    });

    it('should have setter and getter (activeSystem)', () => {
        expect(headerService.activeSystem).toBeNull();
        headerService.activeSystem = undefined;

        headerService.activeSystem$.subscribe(() => {
            expect(headerService.activeSystem).toBeUndefined();
            expect(headerService.lastActive).toBeNull();
        });
    });

    it('should set active system)', () => {
        const systemMock = setupTest41System();
        expect(headerService.activeSystem).toBeNull();
        headerService.activeSystem = systemMock;

        headerService.activeSystem$.subscribe(() => {
            expect(headerService.activeSystem).toEqual(systemMock);
            expect(headerService.lastActive).toEqual(systemMock);
        });
    });

    it('should set location (/)', () => {
        headerService.setLocation('/');
        expect(headerService.currentLocation).toEqual({ isSystem: false });
    });

    it('should set location (/systems)', () => {
        headerService.setLocation('/systems');
        expect(headerService.currentLocation)
            .toEqual({ isSystem: true, parentNode: undefined, path: '/systems' });
    });

    it('should set location (/download)', () => {
        headerService.nodes = headerNodes;
        headerService.setLocation('/download');
        expect(headerService.currentLocation.assetId).toBeNull();
        expect(headerService.currentLocation.breadcrumbs.length).toBe(0);
        expect(headerService.currentLocation.isSystem).toBeFalse();
        expect(headerService.currentLocation.childNode).toBeDefined();
        expect(headerService.currentLocation.parentNode).toBeDefined();
        expect(headerService.currentLocation.path).toBe('/download');
    });
});
