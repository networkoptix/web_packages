import { BehaviorSubject } from 'rxjs';

import { kbMenu } from '@mocks/knowledge_base_menu.mock';

import { setupComponent } from '../src/setup';

import { NxDevelopersMenuComponent } from './developers-menu.component';

const initialNode = kbMenu.nodes[0];

const mockService = {
    menuSubject: new BehaviorSubject(kbMenu),
    activeAssetIdSubject: new BehaviorSubject(initialNode.asset_id),
    activeNode: initialNode,
    activeAssetState: '',
};

const setupMenuComponent = (): ReturnType<typeof setupComponent<NxDevelopersMenuComponent>> => {
    NxDevelopersMenuComponent.prototype.service = mockService;
    return setupComponent(NxDevelopersMenuComponent);
};

describe('Test NxDevelopersMenuComponent', () => {
    it('should create component', async () => {
        const { component } = await setupMenuComponent();
        expect(component).toBeTruthy();
    });

    it('should set displayedMenuNodes', async () => {
        const { component } = await setupMenuComponent();
        expect(component.displayedMenuNodes.length).toBeTruthy();
    });

    it('should highlight the correct initial activated node', async () => {
        const { debugElement } = await setupMenuComponent();
        const activeNode = debugElement.nativeElement.querySelector('.activated-highlight');
        const activeNodeName = activeNode.textContent;
        expect(activeNodeName).toBe(initialNode.name);
    });

    it('should show the correct open nodes', async () => {
        const { component } = await setupMenuComponent();
        const { openNodes } = component;
        expect(openNodes.length).toBe(1);
        expect(openNodes[0]).toBe(initialNode.name);
    });

    it('should correctly open node', async () => {
        const { component, debugElement } = await setupMenuComponent();
        const { openNodes } = component;
        const nodeToOpen = debugElement.nativeElement.querySelector(
            '.menu-link:not(.activated-highlight)',
        );
        const nodeToOpenName = nodeToOpen.textContent;
        nodeToOpen.dispatchEvent(new MouseEvent('click'));
        expect(openNodes.length).toBe(2);
        expect(openNodes[1]).toBe(nodeToOpenName);
        component.openNodes = [initialNode.name];
    });

    it('should correctly close node', async () => {
        const { component, debugElement } = await setupMenuComponent();
        const nodeToClose = debugElement.nativeElement.querySelector(
            '.menu-link:not(.activated-highlight)',
        );
        const nodeToCloseName = nodeToClose.textContent;
        const stayOpen = kbMenu.nodes[2].name;
        component.openNodes = [initialNode.name, stayOpen, nodeToCloseName];
        nodeToClose.dispatchEvent(new MouseEvent('click'));
        expect(component.openNodes.length).toBe(2);
        expect(component.openNodes).toEqual([initialNode.name, stayOpen]);
    });

    it('should correctly open multiple nodes', async () => {
        const { component, debugElement } = await setupMenuComponent();
        const [firstNode, secondNode] = debugElement.nativeElement.querySelectorAll(
            '.menu-link:not(.activated-highlight)',
        );
        const firstNodeName = firstNode.textContent;
        const secondNodeName = secondNode.textContent;
        firstNode.dispatchEvent(new MouseEvent('click'));
        secondNode.dispatchEvent(new MouseEvent('click'));
        const { openNodes } = component;
        expect(openNodes.length).toBe(3);
        expect(openNodes).toEqual([initialNode.name, firstNodeName, secondNodeName]);
        component.openNodes = [initialNode.name];
    });

    it('should filter nodes by the query', async () => {
        const { component } = await setupMenuComponent();
        const parent = component.displayedMenuNodes.find(node => node.nodes.length);
        const child = parent.nodes[0];
        component.filterMenuItems(child.name);
        const displayedNodes = component.displayedMenuNodes;
        const { openNodes } = component;
        expect(openNodes.length).toBe(2);
        expect(openNodes).toEqual([child.name, parent.name]);
        expect(displayedNodes.length).toBe(1);
    });
});
