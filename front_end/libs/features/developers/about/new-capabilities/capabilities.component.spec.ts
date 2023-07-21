import { capabilitiesNode } from '@mocks/knowledge_base_landing.mock';
import { setupComponent } from '@pages/src/setup';

import { NxNewCapabilitiesComponent } from './capabilities.component';

const setupCapabilitiesComponent = (): ReturnType<
    typeof setupComponent<NxNewCapabilitiesComponent>
> => setupComponent(NxNewCapabilitiesComponent, { devCapabilitiesNode: capabilitiesNode });

describe('NewCapabilitiesComponent', () => {
    it('should create', async () => {
        const { component } = await setupCapabilitiesComponent();
        expect(component).toBeTruthy();
    });
});
