import { setupComponent } from '@components/src/setup';

import { NxPagePlaceholderGenericV2Component } from './page-placeholder.component';

const setupPagePlaceholderComponent = (): ReturnType<
    typeof setupComponent<NxPagePlaceholderGenericV2Component>
> => setupComponent(NxPagePlaceholderGenericV2Component);

describe('NxPagePlaceholderGenericV2Component', () => {
    it('should create', async () => {
        const { component } = await setupPagePlaceholderComponent();
        expect(component).toBeTruthy();
    });

    it(`should have iconSize initially as 400`, async () => {
        const { component } = await setupPagePlaceholderComponent();
        expect(component.iconSize).toEqual(400);
    });

    it(`should have iconVisible initially as undefined`, async () => {
        const { component } = await setupPagePlaceholderComponent();
        expect(component.iconVisible).toBeTruthy();
    });
});
