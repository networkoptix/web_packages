import { setupComponent } from '../../../setup';

import { MergeComponent } from './merge.component';

describe('MergeComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(MergeComponent, true);
        expect(component).toBeTruthy();
    });
});
