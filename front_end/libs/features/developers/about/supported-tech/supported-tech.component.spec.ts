import { supportedTechNode } from '@mocks/knowledge_base_landing.mock';
import { setupComponent } from '@pages/src/setup';

import { NxSupportedTechComponent } from './supported-tech.component';

const setupSupportTechComponent = (): ReturnType<typeof setupComponent<NxSupportedTechComponent>> =>
    setupComponent(NxSupportedTechComponent, { supportedTechNode });

describe('For Developers Landing - Supported Tech Node', () => {
    it('should create the component', async () => {
        const { component } = await setupSupportTechComponent();
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', async () => {
        const { debugElement } = await setupSupportTechComponent();
        const heading = debugElement.nativeElement.querySelector('h2').textContent.trim();

        expect(heading).toBe(supportedTechNode.title);
    });

    it('should show the correct number of tech blocks', async () => {
        const { debugElement } = await setupSupportTechComponent();
        const numTechBlocks = debugElement.nativeElement.querySelectorAll('.tech-block').length;
        const numIconLinks = supportedTechNode.nodes.find(({ title }) => title === 'Icon Links')
            .nodes.length;

        expect(numTechBlocks).toBe(numIconLinks);
    });

    it('should show the correct number of language blocks', async () => {
        const { debugElement } = await setupSupportTechComponent();
        const numLangBlocks = debugElement.nativeElement.querySelectorAll('.language-block').length;
        const textLinks = supportedTechNode.nodes.find(({ title }) => title === 'Text Links').nodes
            .length;

        expect(numLangBlocks).toBe(textLinks);
    });

    it('should show the language and tech sections in the correct order', async () => {
        const { debugElement } = await setupSupportTechComponent();
        const sections = [
            ...debugElement.nativeElement.querySelectorAll('.supported-tech > div'),
        ].map(el => el.className);
        const expectedSections = supportedTechNode.nodes.map(({ title }) =>
            title === 'Icon Links'
                ? 'tech-wrapper'
                : title === 'Text Links'
                ? 'language-wrapper'
                : '',
        );

        expect(sections).toEqual(expectedSections);
    });

    it('should show the correct tech tooltip', async () => {
        const { debugElement } = await setupSupportTechComponent();
        const tooltip = debugElement.nativeElement.querySelector('.tech-block').title;
        const techNode = supportedTechNode.nodes.find(({ title }) => title === 'Icon Links')
            .nodes[0];

        expect(tooltip).toBe(techNode.title);
    });

    it('should show the correct language text and tooltip', async () => {
        const { debugElement } = await setupSupportTechComponent();
        const block = debugElement.nativeElement.querySelector('.language-block');
        const langNode = supportedTechNode.nodes.find(({ title }) => title === 'Text Links')
            .nodes[0];

        expect(block.textContent.trim()).toBe(langNode.title);
        expect(block.title).toBe(langNode.title);
    });
});
