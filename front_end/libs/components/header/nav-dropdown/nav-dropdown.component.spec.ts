import { setupComponent } from '@components/src/setup';

import { NxNavDropdownComponent } from './nav-dropdown.component';

const dropdownNode = {
    display_name: 'nodeName',
    url: 'testUrl',
    queryParamsHandling: undefined,
    breadcrumbs: [],
    name: 'nameNode',
    nodes: [
        {
            display_name: 'innerNodeName',
            url: 'testUrl1',
            queryParamsHandling: undefined,
            breadcrumbs: [],
            name: 'nameInnerNode',
            nodes: [],
            authentication: undefined,
            new_window: false,
            asset_id: null,
            related_asset_ids: [],
            next_item: false,
            urlified: 'testUrlified',
            subtitle: 'subtitleText',
            name_raw: 'innerNameRaw',
        },
        {
            display_name: 'innerNodeName2',
            url: 'testUrl2',
            queryParamsHandling: undefined,
            breadcrumbs: [],
            name: 'nameInnerNode2',
            nodes: [],
            authentication: undefined,
            new_window: false,
            asset_id: null,
            related_asset_ids: [],
            next_item: false,
            urlified: 'testUrlified',
            subtitle: 'subtitleText',
            name_raw: 'innerNameRaw2',
        },
    ],
    authentication: undefined,
    new_window: false,
    asset_id: null,
    related_asset_ids: [],
    next_item: false,
    urlified: 'testUrlified',
    subtitle: 'subtitleText',
    name_raw: 'nameRaw',
};

const setupNavDropdownComponent = async (): ReturnType<
    typeof setupComponent<NxNavDropdownComponent>
> => {
    const setup = await setupComponent(NxNavDropdownComponent);
    setup.component.dropdownNode = dropdownNode;
    setup.fixture.detectChanges();
    return setup;
};

describe('NxNavDropdownComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupNavDropdownComponent();
        expect(component).toBeTruthy();
    });

    it('should set up basic component', async () => {
        const { debugElement } = await setupNavDropdownComponent();
        const button = debugElement.nativeElement.querySelectorAll('button');
        expect(button.length).toBe(1);
        expect(button[0].textContent.trim()).toBe(dropdownNode.display_name);
        const icons = debugElement.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
        const dropdown = debugElement.nativeElement.querySelector('ul.dropdown-menu');
        expect(dropdown.style.display).toBe('none');
        const dropdownItems = debugElement.nativeElement.querySelectorAll(
            'li.dropdown-item-container',
        );
        expect(dropdownItems.length).toBe(2);
        const nodeNames = debugElement.nativeElement.querySelectorAll('span');
        expect(nodeNames.length).toBe(2);
        expect(nodeNames[0].textContent.trim()).toBe(dropdownNode.nodes[0].name);
        expect(nodeNames[1].textContent.trim()).toBe(dropdownNode.nodes[1].name);
        const arrowUp = debugElement.nativeElement.querySelectorAll('div.popup');
        expect(arrowUp.length).toBe(0);
    });

    it('should show dropdown items', async () => {
        const { debugElement, component, fixture } = await setupNavDropdownComponent();
        component.show = true;
        fixture.detectChanges();
        const button = debugElement.nativeElement.querySelectorAll('button');
        expect(button.length).toBe(1);
        expect(button[0].textContent.trim()).toBe(dropdownNode.display_name);
        const icons = debugElement.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
        const dropdown = debugElement.nativeElement.querySelector('ul.dropdown-menu');
        expect(dropdown.style.display).toBe('inline-block');
        const dropdownItems = debugElement.nativeElement.querySelectorAll(
            'li.dropdown-item-container',
        );
        expect(dropdownItems.length).toBe(2);
        const arrowUp = debugElement.nativeElement.querySelectorAll('div.popup');
        expect(arrowUp.length).toBe(1);
    });
});
