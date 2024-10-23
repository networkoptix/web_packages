import { setupComponent } from '@components/src/setup';

import { NxPagePlaceholderComponent } from './page-placeholder.component';

const setWindowSize = (width: number = 1200, height: number = 600): void => {
    window.innerWidth = width;
    window.innerHeight = height;
};

const setupPagePlaceholderComponent = (): ReturnType<
    typeof setupComponent<NxPagePlaceholderComponent>
> => setupComponent(NxPagePlaceholderComponent);

describe('NxPagePlaceholderComponent', () => {
    it('should create w/ init value', async () => {
        setWindowSize(600, 420);
        const { component } = await setupPagePlaceholderComponent();
        expect(component.iconSize).toBe(200);
        expect(component.iconVisible).toBeFalsy();
    });

    it('should resize for bigger screen', async () => {
        setWindowSize();
        const { component } = await setupPagePlaceholderComponent();
        expect(component.iconSize).toBe(400);
        expect(component.iconVisible).toBeTruthy();
    });
});
