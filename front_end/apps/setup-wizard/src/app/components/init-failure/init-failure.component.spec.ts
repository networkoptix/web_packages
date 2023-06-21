import { setupComponent } from '../../../setup';

import { InitFailureComponent } from './init-failure.component';

describe('InitFailureComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(InitFailureComponent);
        expect(component).toBeTruthy();
    });
});
