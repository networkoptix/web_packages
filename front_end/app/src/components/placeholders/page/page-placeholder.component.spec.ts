import {
    ComponentFixture,
    inject,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

import { NxPagePlaceholderComponent } from './page-placeholder.component';

describe('NxPagePlaceholderComponent', () => {
    let component: NxPagePlaceholderComponent;
    let fixture: ComponentFixture<NxPagePlaceholderComponent>;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [NxPagePlaceholderComponent],
                providers: [
                    MockProvider(NxLanguageProviderService),
                    MockProvider(NxConfigService),
                    MockProvider(NxScrollMechanicsService)
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxPagePlaceholderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create w/ init value',
        inject([NxScrollMechanicsService], (scrollMechanicsService: NxScrollMechanicsService) => {
            scrollMechanicsService.windowSizeSubject.subscribe(() => {
                expect(component.iconSize).toBe(200);
                expect(component.iconVisible).toBeFalse();
            });
        }));

    it('should resize for bigger screen',
        inject([NxScrollMechanicsService], (scrollMechanicsService: NxScrollMechanicsService) => {
            scrollMechanicsService.windowSizeSubject.next({ height: 800, width: 1024 });

            scrollMechanicsService.windowSizeSubject.subscribe(() => {
                expect(component.iconSize).toBe(400);
                expect(component.iconVisible).toBeTrue();
            });
        }));

    it('should initialize NO_CAMS', () => {
        component.type = 'NO_CAMS';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.systemHasNoCameras());
        expect(component.message).toBe(component.LANG.common.systemHasNoCamerasMessage());
        expect(component.iconName).toBe('NoCams');
    });

    it('should initialize OFFLINE', () => {
        component.type = 'OFFLINE';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.systemOffline());
        expect(component.message).toBe(component.LANG.common.systemOfflineMessage());
        expect(component.iconName).toBe('Offline');
    });

    it('should initialize OFFLINE_INACCESSIBLE', () => {
        component.type = 'OFFLINE_INACCESSIBLE';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.systemOffline());
        expect(component.message).toBe(component.LANG.common.inaccessibleFeatureMessage());
        expect(component.iconName).toBe('Wrong');
    });

    it('should initialize NO_ALERTS', () => {
        component.type = 'NO_ALERTS';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.systemNoAlerts());
        expect(component.message).toBe(component.LANG.common.systemNoAlertsMessage());
        expect(component.iconName).toBe('NoActions');
    });

    it('should initialize 500', () => {
        component.type = '500';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.systemServerError());
        expect(component.message).toBe(component.LANG.common.systemServerErrorMessage());
        expect(component.iconName).toBe('500');
    });

    it('should initialize NEW_VERSION', () => {
        component.type = 'NEW_VERSION';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.systemNewVersion());
        expect(component.message).toBe(component.LANG.common.systemNewVersionMessage());
        expect(component.iconName).toBe('NewVersion');
    });

    it('should initialize ACCOUNT_CREATED', () => {
        component.type = 'ACCOUNT_CREATED';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.account.created.title());
        expect(component.iconName).toBe('SendEmail');
    });

    it('should initialize ACCOUNT_ACTIVATED', () => {
        component.type = 'ACCOUNT_ACTIVATED';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.common.account.activated.title());
        expect(component.message).toBe('');
        expect(component.iconName).toBe('Activated');
    });

    it('should initialize FAILED_TO_ACCESS_SYSTEM', () => {
        component.type = 'FAILED_TO_ACCESS_SYSTEM';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.pageTitles.failedToAccessSystem());
        expect(component.message).toBe(component.LANG.errorCodes.failedToAccessSystem());
        expect(component.iconName).toBe('NoAccess');
    });

    it('should initialize FAILED_TO_ACCESS_CAMERA', () => {
        component.type = 'FAILED_TO_ACCESS_CAMERA';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.pageTitles.failedToAccessCamera());
        expect(component.message).toBe(component.LANG.errorCodes.failedToAccessCamera());
        expect(component.iconName).toBe('NoAccess');
    });

    it('should initialize 404', () => {
        component.type = '404';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.pageTitles.pageNotFound());
        expect(component.message).toBe('');
        expect(component.iconName).toBe('404');
    });

    it('should initialize SERVER_OFFLINE', () => {
        component.type = 'SERVER_OFFLINE';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.placeholderTexts.server.title());
        expect(component.message).toBe(component.LANG.placeholderTexts.server.message());
        expect(component.iconName).toBe('Offline');
    });

    it('should initialize NO_SETTINGS', () => {
        component.type = 'NO_SETTINGS';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(component.LANG.placeholderTexts.noSettings.title());
        expect(component.message).toBe(component.LANG.placeholderTexts.noSettings.message());
        expect(component.iconName).toBe('NoSettings');
    });
});
