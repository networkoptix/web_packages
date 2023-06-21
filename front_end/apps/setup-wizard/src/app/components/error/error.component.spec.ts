import { setupComponent } from '../../../setup';

import { ErrorComponent } from './error.component';

describe('ErrorComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(ErrorComponent);
        expect(component).toBeTruthy();
    });
});
