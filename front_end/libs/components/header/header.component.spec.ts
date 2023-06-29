import { of } from 'rxjs';

import type { MenuNode } from '@services/menus.service.types';

import { setupComponent } from '../src/setup';

import { NxHeaderComponent } from './header.component';

const menuMock = {
    getMenu: () => of({
        description: '',
        title: '',
        nodes: [
            {
                accepted: true,
                asset_id: null,
                asset_type: null,
                authentication: 'Both',
                breadcrumbs: [],
                display_name: 'For Developers',
                draft: null,
                icon: '',
                name: 'For Developers',
                name_raw: 'For Developers',
                new_window: false,
                next_item: false,
                nodes: [],
                order: 0,
                pending: false,
                related_asset_ids: [],
                subtitle: '',
                url: '',
                invisible: false
            },
            {
                accepted: true,
                asset_id: null,
                asset_type: null,
                authentication: 'Both',
                breadcrumbs: [],
                display_name: 'Services',
                draft: null,
                icon: 'services.svg',
                name: 'Services',
                name_raw: 'Services',
                new_window: false,
                next_item: false,
                nodes: [],
                order: 1,
                pending: false,
                related_asset_ids: [],
                subtitle: '',
                url: '',
                invisible: false
            }
        ]
    }),
    cleanEmptyNodes: (header: MenuNode) => header.nodes
};
const headerMock = {
    systemIdSubject: of(''),
    currentLocation: {},
    setLocation: () => {}
};
const appStateMock = {
    headerVisibleSubject: of(true)
};

const setupHeaderComponent = async (): ReturnType<typeof setupComponent<NxHeaderComponent>> => {
    const setup = await setupComponent(NxHeaderComponent);
    setup.component.headerService = headerMock as unknown as typeof setup.component.headerService;
    setup.component.appState = appStateMock as unknown as typeof setup.component.appState;
    setup.component.menusService = menuMock as unknown as typeof setup.component.menusService;
    setup.fixture.detectChanges();
    return setup;
};

describe('NxHeaderComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupHeaderComponent();
        expect(component).toBeTruthy();
    });

    it('should load basic component - not logged in', async () => {
        const { debugElement } = await setupHeaderComponent();
        expect(debugElement.nativeElement.querySelectorAll('.invisible').length).toBe(0);
        expect(debugElement.nativeElement.querySelector('header')).toBeTruthy();
        const navbarLeft = debugElement.nativeElement.querySelectorAll('.app-header-left .navbar-nav');
        expect(navbarLeft.length).toBe(2);
        const navbarRight = debugElement.nativeElement.querySelectorAll('.app-header-right .navbar-nav');
        expect(navbarRight.length).toBe(3);
        const icons = debugElement.nativeElement.querySelectorAll('img');
        expect(icons.length).toBe(2);
    });

    it('should show links - not logged in', async () => {
        const { debugElement } = await setupHeaderComponent();
        const links = debugElement.nativeElement.querySelectorAll('a');
        expect(links.length).toBe(8);
        expect(links[1].textContent.trim()).toBe('Create Account');
        expect(links[2].textContent.trim()).toBe('Log In');
    });

    it('should load basic webadmin component - not logged in', async () => {
        const { component, debugElement, fixture } = await setupHeaderComponent();
        component.hideWebAdmin = true;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelectorAll('.invisible').length).toBe(2);
        expect(debugElement.nativeElement.querySelector('header')).toBeTruthy();
        const navbarLeft = debugElement.nativeElement.querySelectorAll('.app-header-left .navbar-nav');
        expect(navbarLeft.length).toBe(2);
        const navbarRight = debugElement.nativeElement.querySelectorAll('.app-header-right .navbar-nav');
        expect(navbarRight.length).toBe(3);
        const icons = debugElement.nativeElement.querySelectorAll('img');
        expect(icons.length).toBe(2);
    });
});
