import { DebugElement } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { setupComponent } from '@app/features/src/setup';
import {
    integrationsNode
} from '@mocks/knowledge_base_landing.mock';

import { NxIntegrationsComponent } from './integrations.component';

const pluginsToShow = 3;

const [infoNode, pluginsNode] = integrationsNode.nodes;
const firstPluginNode = pluginsNode.nodes[0];
const integrations = { count: 32 };

const cloudApi = {
    getIntegrationsCount: () => new BehaviorSubject(integrations)
} as unknown as NxIntegrationsComponent['cloudApi'];

const setupIntegrationsComponent = (): ReturnType<typeof setupComponent<NxIntegrationsComponent>> => setupComponent(NxIntegrationsComponent, { integrationsNode, cloudApi });

const getInfoBlock = (debugElement: DebugElement) => {
    const block = debugElement.nativeElement.querySelector('.info-block');
    const title = block.querySelector('h3').textContent.trim();
    const content = block.querySelector('p').textContent.trim();
    const button = block.querySelector('button').textContent.trim();
    return { title, content, button };
};

const getPluginsBlock = (debugElement: DebugElement) => {
    const block = debugElement.nativeElement.querySelector('.integrations-block');
    const title = block.querySelector('h3').textContent.trim();
    const button = block.querySelector('button').textContent.trim();
    const shownPlugins = block.querySelectorAll('.integration-block:not(.more-span)').length;
    // const additionalPlugins = block.querySelector('.more-span > p > strong').textContent.trim();
    const firstPluginBlock = block.querySelector('.integration-block');
    const firstPlugin = {
        altText: firstPluginBlock.querySelector('img').alt,
        iconSrc: firstPluginBlock.querySelector('img').src
    };
    return { title, button, shownPlugins, firstPlugin };
};

describe('NxIntegrationsComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupIntegrationsComponent();
        expect(component).toBeTruthy();
    });

    it('should show the correct title', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        const title = debugElement.nativeElement.querySelector('h2').textContent.trim();
        expect(title).toBe(integrationsNode.title);
    });

    it('should show the correct info block heading', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getInfoBlock(debugElement).title).toBe(infoNode.title);
    });

    it('should show the correct info block button', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getInfoBlock(debugElement).button).toBe(infoNode.subtitle);
    });

    it('should show the correct info block content', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getInfoBlock(debugElement).content).toBe(infoNode.asset.shortDescription);
    });

    it('should show the correct plugins heading', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getPluginsBlock(debugElement).title).toBe(pluginsNode.title);
    });

    it('should show the correct plugins block button', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getPluginsBlock(debugElement).button).toBe(pluginsNode.subtitle);
    });

    it('should show the correct number of plugins', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getPluginsBlock(debugElement).shownPlugins).toBe(pluginsToShow);
    });

    /**
     * TODO: Need to find a better way to mock DomSanitizer
     */
    xit('should show the correct number of additional plugins', async () => {
        // const { debugElement } = await setupIntegrationsComponent();
        // expect(getPluginsBlock(debugElement).additionalPlugins).toBe((integrations.count - pluginsToShow).toString());
    });

    it('should show the correct plugin alt text', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getPluginsBlock(debugElement).firstPlugin.altText).toBe(firstPluginNode.title);
    });

    it('should show the correct plugin icon', async () => {
        const { debugElement } = await setupIntegrationsComponent();
        expect(getPluginsBlock(debugElement).firstPlugin.iconSrc).toBe(firstPluginNode.asset.information.logo);
    });
});
