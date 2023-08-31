import { setupComponent } from '@components/src/setup';
import staticLang from '@language_static';
import { windowFactory } from '@services/window-provider';

import { NxPagePlaceholderComponent } from './page-placeholder.component';

const setWindowSize = (width: number = 1200, height: number = 600): void => {
    windowFactory().innerWidth = width;
    windowFactory().innerHeight = height;
};

const setupPagePlaceholderComponent = (): ReturnType<
    typeof setupComponent<NxPagePlaceholderComponent>
> => setupComponent(NxPagePlaceholderComponent);

describe('NxPagePlaceholderComponent', () => {
    it('should create w/ init value', async () => {
        setWindowSize(600, 420);
        const { component } = await setupPagePlaceholderComponent();
        expect(component.iconSize).toBe(200);
        expect(component.iconVisible).toBeFalsy();
    });

    it('should resize for bigger screen', async () => {
        setWindowSize();
        const { component } = await setupPagePlaceholderComponent();
        expect(component.iconSize).toBe(400);
        expect(component.iconVisible).toBeTruthy();
    });

    it('should initialize NO_CAMS', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'NO_CAMS';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.systemHasNoCameras);
        expect(component.message).toBe(staticLang.common.systemHasNoCamerasMessage);
        expect(component.iconName).toBe('NoCams');
    });

    it('should initialize OFFLINE', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'OFFLINE';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.systemOffline);
        expect(component.message).toBe(staticLang.common.systemOfflineMessage);
        expect(component.iconName).toBe('Offline');
    });

    it('should initialize OFFLINE_INACCESSIBLE', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'OFFLINE_INACCESSIBLE';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.systemOffline);
        expect(component.message).toBe(staticLang.common.inaccessibleFeatureMessage);
        expect(component.iconName).toBe('Wrong');
    });

    it('should initialize NO_ALERTS', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'NO_ALERTS';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.systemNoAlerts);
        expect(component.message).toBe(staticLang.common.systemNoAlertsMessage);
        expect(component.iconName).toBe('NoActions');
    });

    it('should initialize 500', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = '500';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.systemServerError);
        expect(component.message).toBe(staticLang.common.systemServerErrorMessage);
        expect(component.iconName).toBe('500');
    });

    it('should initialize NEW_VERSION', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'NEW_VERSION';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.systemNewVersion);
        expect(component.message).toBe(staticLang.common.systemNewVersionMessage);
        expect(component.iconName).toBe('NewVersion');
    });

    it('should initialize ACCOUNT_CREATED', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'ACCOUNT_CREATED';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.account.created.title);
        expect(component.iconName).toBe('SendEmail');
    });

    it('should initialize ACCOUNT_ACTIVATED', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'ACCOUNT_ACTIVATED';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.common.account.activated.title);
        expect(component.message).toBe('');
        expect(component.iconName).toBe('Activated');
    });

    it('should initialize FAILED_TO_ACCESS_SYSTEM', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'FAILED_TO_ACCESS_SYSTEM';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.pageTitles.failedToAccessSystem);
        expect(component.message).toBe(staticLang.errorCodes.failedToAccessSystem);
        expect(component.iconName).toBe('NoAccess');
    });

    it('should initialize FAILED_TO_ACCESS_CAMERA', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'FAILED_TO_ACCESS_CAMERA';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.pageTitles.failedToAccessCamera);
        expect(component.message).toBe(staticLang.errorCodes.failedToAccessCamera);
        expect(component.iconName).toBe('NoAccess');
    });

    it('should initialize 404', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = '404';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.pageTitles.pageNotFound);
        expect(component.message).toBe('');
        expect(component.iconName).toBe('404');
    });

    it('should initialize SERVER_OFFLINE', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'SERVER_OFFLINE';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.placeholderTexts.server.title);
        expect(component.message).toBe(staticLang.placeholderTexts.server.message);
        expect(component.iconName).toBe('Offline');
    });

    it('should initialize NO_SETTINGS', async () => {
        const { component } = await setupPagePlaceholderComponent();
        component.type = 'NO_SETTINGS';
        component.ngOnInit();

        expect(component.placeholderTitle).toBe(staticLang.placeholderTexts.noSettings.title);
        expect(component.message).toBe(staticLang.placeholderTexts.noSettings.message);
        expect(component.iconName).toBe('NoSettings');
    });
});
