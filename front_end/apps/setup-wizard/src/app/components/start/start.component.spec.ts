import { setupComponent } from '../../../setup';

import { StartComponent } from './start.component';

describe('StartComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(StartComponent);
        expect(component).toBeTruthy();
    });
});
