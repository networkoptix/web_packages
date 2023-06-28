import { headerNodes } from '@app/_mocks/nodesMock';
import { setupTest41System } from '@app/_mocks/system.test';

import { NxMenusService } from './menus.service';
import { nxConfig } from './nx-config/config';
import { setupTestBed } from './src/setup';

const setupMenu = async (): Promise<NxMenusService> => {
    const { inject } = await setupTestBed();
    nxConfig.dynamicMenus = {
        header: {
            title: '',
            description: '',
            nodes: headerNodes
        }
    };
    return inject(NxMenusService);
};

describe('Menus service', () => {
    it('should create the service', async () => {
        const menu = await setupMenu();
        expect(menu).toBeTruthy();
    });

    it('should get header menu', async () => {
        const menu = await setupMenu();
        menu.getMenu('header', false).subscribe(filtered => {
            expect(filtered).toBeDefined();
            expect(filtered.nodes.length).toBe(1);

            const node = filtered.nodes[0];
            expect(node.name).toBe('Services');
            expect(node.breadcrumbs.length).toBe(0);
            expect(node.nodes.length).toBe(3);

            expect(node.nodes[0].name).toBe('Downloads');
            expect(node.nodes[0].breadcrumbs.length).toBe(1);
            expect(node.nodes[0].breadcrumbs[0].name).toBe('Services');
            expect(node.nodes[0].nodes.length).toBe(0);
            // rest of the nodes follow same logic
        });
    });

    it('should set active system menu', async () => {
        const menu = await setupMenu();
        const systemMock = setupTest41System();
        menu.updateActiveSystemMenu(systemMock);

        menu.currentSystemNode$.subscribe(activeSystemNode => {
            expect(activeSystemNode.name).toBe(systemMock.info.name);
            expect(activeSystemNode.url).toBe(`/systems/${systemMock.id}`);
            expect(activeSystemNode.nodes.length).toBe(2);
            expect(activeSystemNode.nodes[0].name).toBe('View');
            expect(activeSystemNode.nodes[0].url).toBe(`/systems/${systemMock.id}/view`);
            expect(activeSystemNode.nodes[1].name).toBe('Settings');
            expect(activeSystemNode.nodes[1].url).toBe(`/systems/${systemMock.id}`);
        });
    });
});
