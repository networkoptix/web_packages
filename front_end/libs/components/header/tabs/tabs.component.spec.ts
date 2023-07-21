import { setupComponent } from '@components/src/setup';

import { NxTabsComponent } from './tabs.component';
const currentLocation = {
    path: 'testUrl',
};

const node = {
    display_name: 'nodeName',
    url: 'testUrl',
    queryParamsHandling: undefined,
    breadcrumbs: [],
    name: 'nameNode',
    nodes: [],
    authentication: undefined,
    new_window: false,
    asset_id: null,
    related_asset_ids: [],
    next_item: false,
    urlified: 'testUrlified',
    subtitle: 'subtitleText',
    name_raw: 'nameRaw',
    invisible: false,
};

const setupTabsComponent = async (): ReturnType<typeof setupComponent<NxTabsComponent>> => {
    const setup = await setupComponent(NxTabsComponent);
    setup.component.headerService.currentLocation = currentLocation;
    setup.component.node = node;
    setup.fixture.detectChanges();
    return setup;
};

describe('NxTabsComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupTabsComponent();
        expect(component).toBeTruthy();
    });

    it('should set up basic component', async () => {
        const { debugElement } = await setupTabsComponent();

        expect(debugElement.nativeElement.querySelector('li.tab-link')).toBeTruthy();
        expect(debugElement.nativeElement.querySelector('.active')).toBeTruthy();
        expect(debugElement.nativeElement.querySelector('a').textContent).toBe('nodeName');
    });

    it('should not show if new window', async () => {
        const { component, debugElement, fixture } = await setupTabsComponent();
        component.node.new_window = true;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('li.tab-link')).toBeFalsy();
    });

    it('should not have active class if not current url', async () => {
        const { component, debugElement, fixture } = await setupTabsComponent();
        component.node.url = 'notTestUrl';
        component.node.new_window = true;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('.active')).toBeFalsy();
    });
});
