import { setupComponent } from '../../setup';

import { LegacyCloudAppComponent } from './legacy-cloud.component';

describe('AppComponent', () => {
    it('should create the app', async () => {
        const { component } = await setupComponent(LegacyCloudAppComponent);

        expect(component).toBeTruthy();
    });
});
