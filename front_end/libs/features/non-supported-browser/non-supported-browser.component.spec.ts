import { setupComponent } from '../src/setup';

import { NonSupportedBrowserComponent } from './non-supported-browser.component';

const setupNonSupportedBrowserComponent = (): ReturnType<
    typeof setupComponent<NonSupportedBrowserComponent>
> => setupComponent(NonSupportedBrowserComponent);

describe('NonSupportedBrowserComponent', () => {
    it('should create NonSupportedBrowserComponent', async () => {
        const { component } = await setupNonSupportedBrowserComponent();
        expect(component).toBeTruthy();
    });
});
