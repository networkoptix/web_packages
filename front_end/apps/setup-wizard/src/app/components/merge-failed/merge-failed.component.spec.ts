import { setupComponent } from '../../../setup';

import { MergeFailedComponent } from './merge-failed.component';

describe('MergeFailedComponent', () => {
    it('should create', async () => {
        const { component } = await setupComponent(MergeFailedComponent);
        expect(component).toBeTruthy();
    });
});
