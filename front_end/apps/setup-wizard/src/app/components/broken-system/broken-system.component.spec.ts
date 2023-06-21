import { setupComponent } from '../../../setup';

import { BrokenSystemComponent } from './broken-system.component';

describe('BrokenSystemComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(BrokenSystemComponent);
        expect(component).toBeTruthy();
    });
});
