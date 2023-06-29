import { NxMenusService } from '@app/services/menus.service';
import { MenuNode } from '@services/menus.service.types';

import { setupComponent } from '../src/setup';

import { NxFooterComponent } from './footer.component';

const nodes = [
    {
        accepted: true,
        asset_id: null,
        asset_type: null,
        authentication: 'Both',
        breadcrumbs: [],
        display_name: 'About Nx Cloud',
        draft: null,
        icon: '',
        name: 'About Nx Cloud',
        name_raw: 'About %CLOUD_NAME%',
        new_window: false,
        next_item: false,
        nodes: [],
        order: 1,
        pending: false,
        related_asset_ids: [],
        subtitle: '',
        url: '/content/about'
    },
    {
        accepted: true,
        asset_id: null,
        asset_type: null,
        authentication: 'Both',
        breadcrumbs: [],
        display_name: 'Download Nx Witness',
        draft: null,
        icon: '',
        name: 'Download Nx Witness',
        name_raw: 'Download %VMS_NAME%',
        new_window: false,
        next_item: false,
        nodes: [],
        order: 2,
        pending: false,
        related_asset_ids: [],
        subtitle: '',
        url: '/download'
    }
] as MenuNode[];

const cloudHost = 'test';

const setupFooterComponent = async (): ReturnType<typeof setupComponent<NxFooterComponent>> => {
    const setup = await setupComponent(NxFooterComponent);
    const menusService = setup.inject(NxMenusService);
    menusService.CONFIG.dynamicMenus = {
        footer: {
            title: '',
            description: '',
            nodes
        }
    };
    setup.component.CONFIG.company.name = cloudHost;
    menusService.updateMenu();
    setup.component.ngOnInit();
    setup.fixture.detectChanges();
    await setup.fixture.whenStable();
    return setup;
};

describe('NxFooterComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupFooterComponent();
        expect(component).toBeTruthy();
    });

    it('should set up the basic component', async () => {
        const { debugElement } = await setupFooterComponent();
        const links = debugElement.nativeElement.querySelectorAll('a');
        expect(links.length).toBe(3);
        expect(links[0].textContent).toBe(nodes[0].display_name);
        expect(links[1].textContent).toBe(nodes[1].display_name);
        expect(links[2].className).toContain('copyright');
        expect(links[2].innerHTML).toBe(`©&nbsp;${cloudHost}`);
    });
});
