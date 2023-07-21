import { supportNode } from '@mocks/knowledge_base_landing.mock';
import { setupComponent } from '@pages/src/setup';
import { images } from '@variables/static-variables';

import { NxSupportComponent } from './support.component';

const setupSupportComponent = (): ReturnType<typeof setupComponent<NxSupportComponent>> =>
    setupComponent(NxSupportComponent, { supportNode });

const [_, expectedLeftBackground, expectedRightBackground] = supportNode.icon.split(' ');

describe('NxSupportComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupSupportComponent();
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', async () => {
        const { debugElement } = await setupSupportComponent();
        const heading = debugElement.nativeElement
            .querySelector('.support-link')
            .textContent.trim();
        expect(heading).toBe(supportNode.title);
    });

    it('should show the correct body content', async () => {
        const { debugElement } = await setupSupportComponent();
        const body = debugElement.nativeElement.querySelector('.support-body').innerHTML;
        expect(body.trim()).toBe(supportNode.asset.shortDescription.trim());
    });

    it('should show the correct background on left side', async () => {
        const { debugElement } = await setupSupportComponent();
        const leftBackground =
            debugElement.nativeElement.querySelector('.left-image > svg-icon').dataset.src;
        expect(leftBackground).toBe(images.dirDevelopers + expectedLeftBackground);
    });

    it('should show the correct background on right side', async () => {
        const { debugElement } = await setupSupportComponent();
        const rightBackground =
            debugElement.nativeElement.querySelector('.right-image > svg-icon').dataset.src;
        expect(rightBackground).toBe(images.dirDevelopers + expectedRightBackground);
    });
});
