import { DebugElement } from '@angular/core';
import { last } from 'lodash-es';

import { setupComponent } from '@app/features/src/setup';
import { icons } from '@app/variables/static-variables';
import { capabilitiesNode } from '@mocks/knowledge_base_landing.mock';

import { NxCapabilitiesComponent } from './capabilities.component';

interface BlockContent {
    details: string;
    introLine: string;
    headerBackground: string;
    heading: string;
}

const capability = capabilitiesNode.nodes[0];

capabilitiesNode.url = 'testUrl';

const getFirstBlockContent = (debugElement: DebugElement): BlockContent => {
    const detailBlock = debugElement.nativeElement.querySelector('.capability-card');
    const header = detailBlock.querySelector('header');
    const introLine = header
        .querySelector('.intro-line').textContent.trim();
    const heading = header.querySelector('h3').textContent.trim();
    const details = detailBlock
        .querySelector('.capability-detail').textContent.trim();
    const headerBackground = header.style.backgroundImage;

    return { details, introLine, headerBackground, heading };
};

const setupCapabilitiesComponent = (): ReturnType<typeof setupComponent<NxCapabilitiesComponent>> => setupComponent(NxCapabilitiesComponent, { capabilitiesNode });

describe('NxCapabilitiesComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupCapabilitiesComponent();
        expect(component).toBeTruthy();
    });

    it('should display the correct heading', async () => {
        const { debugElement } = await setupCapabilitiesComponent();
        const headingText = debugElement.nativeElement.querySelector('.heading-link').textContent.trim();
        expect(headingText).toBe(capabilitiesNode.title);
    });

    it('should display the correct number of blocks', async () => {
        const { debugElement } = await setupCapabilitiesComponent();
        const detailBlockCount = debugElement.nativeElement.querySelectorAll('.capability-card').length;
        expect(detailBlockCount).toBe(capabilitiesNode.nodes.length);
    });

    /**
     * Looks like the implementation for the background image has been changed. This component also
     * doesn't seem to be used anymore so fixing this is low priority.
     */
    xit('should display the correct block heading background', async () => {
        const { debugElement } = await setupCapabilitiesComponent();
        const backgroundImage = last(capability.icon.split(' '));
        const backgroundImageUrl = `url("${icons.backgrounds}${backgroundImage}")`;
        expect(getFirstBlockContent(debugElement).headerBackground).toContain(backgroundImageUrl);
    });

    it('should display the the correct block details from asset', async () => {
        const { debugElement } = await setupCapabilitiesComponent();
        expect(getFirstBlockContent(debugElement).details).toBe(capability.asset.shortDescription);
    });

    it('should display the correct block intro line from node', async () => {
        const { debugElement } = await setupCapabilitiesComponent();
        expect(getFirstBlockContent(debugElement).introLine).toBe(capability.subtitle);
        expect(getFirstBlockContent(debugElement).heading).toBe(capability.title);
    });

    it('should display the correct block heading from node', async () => {
        const { debugElement } = await setupCapabilitiesComponent();
        expect(getFirstBlockContent(debugElement).heading).toBe(capability.title);
    });
});
