import { waitForAsync, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { setupTest41System } from '@app/_mocks/system.test';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { NxSystem } from './system.service/system';
import { NxUriService } from './uri.service';
import { ChildRoutes } from './uri.service.types';

describe('Uri Service', () => {
    let uriService: NxUriService;

    const configMock = { getConfig: () => nxConfig };
    const queryParams = {
        param1: 'value1',
        param2: 'value2'
    };
    const routeMock = {
        queryParams: of(queryParams),
        snapshot: {
            queryParams: {
                page: 'test'
            }
        }
    };
    const routerMock = {
        url: 'https://cloud-test.hdw.mx/authorize?view_type=desktop&client_type=renewDesktop',
        navigate: () => Promise.resolve(true)
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxUriService,
                { provide: NxConfigService, useValue: configMock },
                { provide: Router, useValue: routerMock },
                { provide: ActivatedRoute, useValue: routeMock },
                { provide: WINDOW, useValue: window }
            ]
        });
        uriService = TestBed.inject(NxUriService);
        uriService['CONFIG'] = configMock.getConfig();
    }));

    it('should create the service', () => {
        expect(uriService).toBeTruthy();
    });

    it('should getUrl', () => {
        expect(uriService.getURL()).toBe('https://cloud-test.hdw.mx/authorize');
    });

    it('should getQueryParams', async () => {
        const params = await uriService.getParams().toPromise();
        expect(params).toEqual(queryParams);
    });

    it('should set params if different', () => {
        expect(uriService.queryParams).toEqual({});
        uriService.queryParams = queryParams;
        expect(uriService.queryParams).toEqual(queryParams);
    });

    it('should call navigateSystem', async () => {
        const success = await uriService.navigateSystem('newUrl', setupTest41System() as NxSystem);
        expect(success).toBe(true);
    });

    it('should return if page edge case triggerd in updateURI', async () => {
        const undefinedExpected = await uriService.updateURI('', { page: 'test' });
        expect(undefinedExpected).toBeUndefined();
        const trueExpected = await uriService.updateURI('', { page: 'notTest' });
        expect(trueExpected).toBe(true);
    });

    it('should return base system settings url', () => {
        expect(uriService.getSystemSettingsRoute()).toBe('/systems/');
    });

    it('should return base system settings with systemId', () => {
        expect(uriService.getSystemSettingsRoute({ systemId: 'systemId' }))
            .toBe('/systems/systemId');
    });

    it('should return system settings with childRoutes', () => {
        expect(uriService.getSystemSettingsRoute({
            systemId: 'systemId',
            childRoute: ChildRoutes.VIEW,
            cameraId: 'cameraId'
        })).toBe('/systems/systemId/view/');
    });

    it('should return system settings with serverId', () => {
        expect(uriService.getSystemSettingsRoute({
            systemId: 'systemId',
            serverId: 'serverId'
        })).toBe('/systems/systemId/servers/serverId');
    });

    // This seems to mess with the test runner itself, hah, so commenting out this function
    // it('should changePort', () => {
    //     const newPort = '7012';
    //     const newOrigin = window.location.origin.replace(window.location.port, newPort);
    //     uriService.changePort(newPort);
    //     expect(window.location.origin).toBe(newOrigin);
    // });
});
