import { setupComponent } from '../../../setup';

import { LocalFailureComponent } from './local-failure.component';

describe('LocalFailureComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(LocalFailureComponent);
        expect(component).toBeTruthy();
    });
});
