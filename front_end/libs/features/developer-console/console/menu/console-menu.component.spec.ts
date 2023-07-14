import { testBedSetupFactory } from 'test_utils/test_bed_setup_factory';
import { v4 as uuid } from 'uuid';

import { ConsoleMode } from '@pages/developer-console/console/console.types';
import { setupComponent } from '@pages/src/setup';
import { NxMenusService } from '@services/menus.service';

import { NxDevConsoleMenuComponent } from './console-menu.component';

const menusMock = {
    getMenu: () => ({
        subscribe: () => {}
    })
};

const menuMock = [...Array(
    Math.round(Math.random() * 20) + 1
)].map(_ => ({
    title: uuid(),
    url: uuid(),
    icon: uuid()
}));

const setupConsoleMenuComponent = (): ReturnType<typeof setupComponent<NxDevConsoleMenuComponent>> => testBedSetupFactory([], [
    { provide: NxMenusService, useValue: menusMock },
])(NxDevConsoleMenuComponent);

describe('NxDevConsoleMenuComponent', () => {
    it('should create NxDevConsoleMenuComponent', async () => {
        const { component } = await setupConsoleMenuComponent();
        expect(component).toBeTruthy();
    });

    it('should not show content heading when not in edit mode', async () => {
        const { component, fixture, debugElement } = await setupConsoleMenuComponent();
        component.loading = false;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('h3')).toBeFalsy();
    });

    it('should show content heading when edit mode', async () => {
        const { component, fixture, debugElement } = await setupConsoleMenuComponent();
        component.loading = false;
        component.type = ConsoleMode.EDIT;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('h3').textContent.trim()).toEqual(
            'Content');
    });

    it('should not show additional links by default', async () => {
        const { component, fixture, debugElement } = await setupConsoleMenuComponent();
        component.loading = false;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector('.additional-links')).toBeFalsy();
    });

    it('should show additional links when edit mode and showAdditionalLinks is true', async () => {
        const { component, fixture, debugElement } = await setupConsoleMenuComponent();
        component.loading = false;
        component.type = ConsoleMode.EDIT;
        component.showAdditionalLinks = true;
        fixture.detectChanges();
        const links = debugElement.nativeElement.querySelector('.additional-links');
        expect(links).toBeTruthy();
        expect(links.firstElementChild.textContent.trim()).toEqual('Show Preview');
        expect(links.lastElementChild.textContent.trim()).toEqual('Version Control');
    });

    it('should not display context menu if not edit mode', async () => {
        const { component, fixture, debugElement } = await setupConsoleMenuComponent();
        component.loading = false;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector(`.${ConsoleMode.EDIT}`)).toBeFalsy();
    });

    it('should display context menu when loaded in edit mode', async () => {
        const { component, fixture, debugElement } = await setupConsoleMenuComponent();
        component.menu = menuMock;
        component.type = ConsoleMode.EDIT;
        component.loading = false;
        fixture.detectChanges();
        expect(debugElement.nativeElement.querySelector(`.${ConsoleMode.EDIT}`)).toBeTruthy();
    });

    it('should display the correct menu items', async () => {
        const { component, fixture, debugElement } = await setupConsoleMenuComponent();
        component.menu = menuMock;
        component.type = ConsoleMode.EDIT;
        component.loading = false;
        fixture.detectChanges();
        const nodes = [...debugElement.nativeElement.querySelector(
            `.${ConsoleMode.EDIT}`).children];
        nodes.forEach((
            { textContent }, index
        ) => expect(textContent).toEqual(
            menuMock[index].title));
    });
});
