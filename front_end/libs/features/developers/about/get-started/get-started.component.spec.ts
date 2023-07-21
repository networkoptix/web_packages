import { DebugElement } from '@angular/core';

import { getStartedNode } from '@mocks/knowledge_base_landing.mock';
import { setupComponent } from '@pages/src/setup';
import { images } from '@variables/static-variables';

import { NxGetStartedComponent } from './get-started.component';

interface StepContent {
    title: string;
    imageSrc: string;
}

const setupGetStartedComponent = (): ReturnType<typeof setupComponent<NxGetStartedComponent>> =>
    setupComponent(NxGetStartedComponent, { getStartedNode });

const stepToTest = 1;
const step = getStartedNode.nodes[stepToTest - 1];
const [stepIcon, stepAnimatedIcon] = step.icon.split(' ');

const getFirstStepContent = (debugElement: DebugElement): StepContent => {
    const detailBlock = debugElement.nativeElement.querySelector('.detail-block');
    const stepText = detailBlock.querySelector('.step-text');
    const title = stepText.querySelector('h3').textContent.trim();
    const imageSrc =
        '/static' + detailBlock.querySelector('.step-image > img').src.split('static')[1];

    return { title, imageSrc };
};

describe('NxGetStartedComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupGetStartedComponent();
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', async () => {
        const { debugElement } = await setupGetStartedComponent();
        const heading = debugElement.nativeElement.querySelector('h2').textContent.trim();

        expect(heading).toBe(getStartedNode.title);
    });

    it('should show the correct number of detail blocks', async () => {
        const { debugElement } = await setupGetStartedComponent();
        const numStepBlocks = debugElement.nativeElement.querySelectorAll('.detail-block').length;
        const numStepNodes = getStartedNode.nodes.length;

        expect(numStepBlocks).toBe(numStepNodes);
    });

    it('should show the correct step title', async () => {
        const { debugElement } = await setupGetStartedComponent();
        expect(getFirstStepContent(debugElement).title).toBe(step.title);
    });

    it('should show the correct step image', async () => {
        const { debugElement } = await setupGetStartedComponent();
        const stepIconSrc = `${images.dirDevelopers}${stepIcon}`;
        expect(getFirstStepContent(debugElement).imageSrc).toBe(stepIconSrc);
    });

    it('should show the correct animated step image state', async () => {
        const { debugElement, fixture } = await setupGetStartedComponent();
        const stepIconSrc = `${images.dirDevelopers}${stepIcon}`;
        const stepIconAnimatedSrc = `${images.dirDevelopers}${stepAnimatedIcon}`;
        const detailBlock = debugElement.nativeElement.querySelector('.detail-block');
        detailBlock.dispatchEvent(new MouseEvent('mouseenter'));
        await fixture.whenStable();
        fixture.detectChanges();
        expect(getFirstStepContent(debugElement).imageSrc).toBe(stepIconAnimatedSrc);
        detailBlock.dispatchEvent(new MouseEvent('mouseleave'));
        await fixture.whenStable();
        fixture.detectChanges();
        expect(getFirstStepContent(debugElement).imageSrc).toBe(stepIconSrc);
    });
});
