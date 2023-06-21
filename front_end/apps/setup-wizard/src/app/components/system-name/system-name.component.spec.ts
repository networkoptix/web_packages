import { setupComponent } from '../../../setup';

import { SystemNameComponent } from './system-name.component';

describe('SystemNameComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(SystemNameComponent);
        expect(component).toBeTruthy();
    });
});
