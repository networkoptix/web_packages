import { setupComponent } from '../../../setup';

import { LocalSuccessComponent } from './local-success.component';

describe('LocalSuccessComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(LocalSuccessComponent);
        expect(component).toBeTruthy();
    });
});
