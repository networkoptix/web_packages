import { BehaviorSubject, Observable } from 'rxjs';
import { testBedSetupFactory } from 'test_utils/test_bed_setup_factory';

import { setupComponent } from '@components/src/setup';
import { NxMenusService } from '@services/menus.service';
import { NxHeaderService } from '@services/nx-header.service';

import { NxHeaderMainButtonComponent } from './main-button.component';
import { mainButtonState } from './main-button.types';

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

const headerMock = {
    currentLocation: {
        path: 'testUrl',
        isSystem: false,
    },
    showSubject: new BehaviorSubject(true),
    activeSystem: {
        name: 'activeSystemName',
    },
    lastActive$: new BehaviorSubject(true),
};

const menusMock = {
    currentSystemNode$: new BehaviorSubject(null),
    getMenu: () => new Observable(null),
    updateActiveSystemMenu: () => {},
};

const setupMainbuttonComponent = async (): ReturnType<
    typeof setupComponent<NxHeaderMainButtonComponent>
> => {
    const setup = await testBedSetupFactory(
        [],
        [
            { provide: NxHeaderService, useValue: headerMock },
            { provide: NxMenusService, useValue: menusMock },
        ],
    )(NxHeaderMainButtonComponent);
    setup.component.node = node;
    setup.component.headerService = headerMock as typeof setup.component.headerService;
    setup.fixture.detectChanges();
    return setup;
};

describe('NxHeaderMainButtonComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupMainbuttonComponent();
        expect(component).toBeTruthy();
    });

    it('should show the base component', async () => {
        const { component, fixture, debugElement } = await setupMainbuttonComponent();
        component.node = undefined;
        fixture.detectChanges();
        const dropdown = debugElement.nativeElement.querySelector('div.dropdown');
        expect(dropdown.className).toContain('show');
        const button = debugElement.nativeElement.querySelectorAll('button');
        expect(button.length).toBe(1);
        expect(debugElement.nativeElement.querySelectorAll('svg-icon').length).toBe(2);
        expect(debugElement.nativeElement.querySelector('span').textContent).toBe('All Site');
    });

    it('should show node state', async () => {
        const { debugElement, component, fixture } = await setupMainbuttonComponent();
        component.headerService.currentLocation.isSystem = false;
        jest.spyOn(component, 'getState').mockReturnValue(mainButtonState.NODE);
        component.ngOnInit();
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('span').textContent).toBe(
            node.display_name,
        );
    });

    it('should show system state for active system', async () => {
        const { fixture, debugElement, component } = await setupMainbuttonComponent();
        jest.spyOn(component, 'getState').mockReturnValue(mainButtonState.SYSTEM);
        component.ngOnInit();
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('span').textContent).toBe(
            'activeSystemName',
        );
    });

    it('should show system state for webadmin', async () => {
        const { component, fixture, debugElement } = await setupMainbuttonComponent();
        Object.defineProperty(component, 'environment', {
            value: { ...component.environment, isLocal: true },
        });
        headerMock.currentLocation.isSystem = false;
        headerMock.activeSystem = {
            name: undefined,
        };
        fixture.detectChanges();
        const span: HTMLSpanElement = debugElement.nativeElement.querySelector('span');
        expect(span.classList).toContain('ellipsis');
        expect(span.textContent).toBe(node.display_name);
    });

    it('should show systems state', async () => {
        const { component, fixture, debugElement } = await setupMainbuttonComponent();
        Object.defineProperty(component, 'environment', {
            value: { ...component.environment, isLocal: false },
        });
        component.systems = [{}, {}, {}];
        jest.spyOn(component, 'getState').mockReturnValue(mainButtonState.SYSTEMS);
        component.ngOnInit();
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('span').textContent).toBe('3\xa0Systems');
        // \xa0 = nonbreaking space
    });

    it('should not have show class', async () => {
        const { fixture, debugElement } = await setupMainbuttonComponent();
        headerMock.showSubject.next(false);
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('div.dropdown').className).not.toContain(
            'show',
        );
    });
});
