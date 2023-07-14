import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { setupComponent } from '@components/src/setup';

import { NxGenericDropdown } from './dropdown.component';
import type { DropdownItem } from './dropdown.component.types';

const dropdownItems: DropdownItem<string>[] = [
    {
        name: 'item1',
        value: '1',
        disabled: false,
        help: undefined,
    },
    {
        name: 'item2',
        value: '2',
        disabled: true,
        help: undefined,
    },
    {
        name: 'horizontal',
        value: '3',
        disabled: false,
        help: undefined,
    },
    {
        name: 'item4',
        value: '4',
        disabled: false,
        help: 'helpText4',
    },
    {
        name: 'item5',
        value: '5',
        disabled: false,
        help: undefined,
    }
];

const setupDropdownComponent = async (): ReturnType<typeof setupComponent<NxGenericDropdown>> => {
    NxGenericDropdown.prototype.items = dropdownItems;
    NxGenericDropdown.prototype.stillLoading = false;
    const setup = await setupComponent(NxGenericDropdown);
    setup.component.writeValue('1');
    return setup;
};

const ButtonClickEvents = {
    left: { button: 0 },
    right: { button: 2 }
};

function click(
    el: DebugElement | HTMLElement,
    eventObj = ButtonClickEvents.left,
): void {
    if (el instanceof HTMLElement) {
        el.click();
    } else {
        el.triggerEventHandler('click', eventObj);
    }
}

describe('NxGenericDropdown', () => {
    it('should create the component', async () => {
        const { component } = await setupDropdownComponent();
        expect(component).toBeTruthy();
    });

    it('should load 4 items', async () => {
        const { debugElement } = await setupDropdownComponent();
        const items = debugElement.queryAll(By.css('.dropdown-item'));
        expect(items.length).toBe(4);
    });

    it('should have one disabled item', async () => {
        const { debugElement } = await setupDropdownComponent();
        const items = debugElement.queryAll(By.css('.disabled'));
        expect(items.length).toBe(2);
    });

    it('should be disabled', async () => {
        const { component, fixture, debugElement } = await setupDropdownComponent();
        component.disabled = true;
        fixture.detectChanges();
        const items = debugElement.queryAll(By.css('[disabled]'));
        expect(items.length).toBe(1);
    });

    it('should NOT have ellipsis-mr class if NOT merge or ellipsisMargin', async () => {
        const { debugElement } = await setupDropdownComponent();
        const items = debugElement.queryAll(By.css('.ellipsis-mr'));
        expect(items.length).toBe(0);
    });

    it('should have ellipsis-mr class if merge', async () => {
        const { component, fixture, debugElement } = await setupDropdownComponent();
        component.merge = true;
        fixture.detectChanges();
        fixture.whenStable();
        const items = debugElement.queryAll(By.css('.ellipsis-mr'));
        expect(items.length).toBe(1);
    });

    it('should have ellipsis-mr class if ellipsisMargin', async () => {
        const { component, fixture, debugElement } = await setupDropdownComponent();
        component.ellipsisMargin = true;
        fixture.detectChanges();
        const items = debugElement.queryAll(By.css('.ellipsis-mr'));
        expect(items.length).toBe(1);
    });

    it('should not have dot1 class if not loading', async () => {
        const { debugElement } = await setupDropdownComponent();
        const items = debugElement.queryAll(By.css('.dot1'));
        expect(items.length).toBe(0);
    });

    it('should have dot1 class if loading', async () => {
        const { component, fixture, debugElement } = await setupDropdownComponent();
        component.stillLoading = true;
        fixture.detectChanges();
        const items = debugElement.queryAll(By.css('.dot1'));
        expect(items.length).toBe(1);
    });

    it('should have an item selected', async () => {
        const { component, fixture, debugElement } = await setupDropdownComponent();
        component.stillLoading = false;
        fixture.detectChanges();
        const toggle = debugElement.queryAll(By.css('.btn-dropdown-toggle'));
        click(toggle[0]);
        fixture.detectChanges();
        const items = debugElement.queryAll(By.css('.dropdown-item'));
        click(items[2]);
        fixture.detectChanges();
        const selectedPostClick = debugElement.nativeElement.querySelector('button.dropdown-toggle span');
        expect(selectedPostClick.textContent).toContain('helpText4');
    });

    it('should have additional-help class if help item exists', async () => {
        const { fixture, debugElement } = await setupDropdownComponent();
        fixture.detectChanges();
        const helpClass = debugElement.queryAll(By.css('.additional-help'));
        expect(helpClass.length).toBe(1);
    });

    it('should NOT have additional-help class if NO help item exists', async () => {
        const { fixture, debugElement, component } = await setupDropdownComponent();
        component.items = component.items.filter(item => !item.help);
        component.ngOnInit();
        fixture.detectChanges();
        const helpClass = debugElement.queryAll(By.css('.additional-help'));
        expect(helpClass.length).toBe(0);
    });

    it('should set show to true on dropdown button click', async () => {
        const { fixture, debugElement, component } = await setupDropdownComponent();
        component.show = false;
        const btnDropdownToggle = debugElement.queryAll(By.css('.btn-dropdown-toggle'));
        click(btnDropdownToggle[0]);
        fixture.detectChanges();
        expect(component.show).toBeTruthy();
    });

    it('should show dropdown-menu if show = true', async () => {
        const { fixture, debugElement, component } = await setupDropdownComponent();
        component.show = true;
        fixture.detectChanges();
        const dropdownMenu = debugElement.queryAll(By.css('.dropdown-show'));
        expect(dropdownMenu.length).toBe(1);
    });

    it('should NOT show dropdown-menu if show = false', async () => {
        const { debugElement } = await setupDropdownComponent();
        const dropdownMenu = debugElement.queryAll(By.css('.dropdown-show'));
        expect(dropdownMenu.length).toBe(0);
    });

    it('should load horizontal div if item with horizontal name exists', async () => {
        const { fixture, debugElement } = await setupDropdownComponent();
        fixture.detectChanges();
        const horizontal = debugElement.nativeElement.querySelector('hr');
        expect(horizontal).toBeTruthy();
    });

    it('should NOT load horizontal div if NO item with horizontal name exists', async () => {
        const { fixture, debugElement, component } = await setupDropdownComponent();
        component.items = component.items.filter(item => item.name !== 'horizontal');
        component.ngOnInit();
        fixture.detectChanges();
        const horizontal = debugElement.nativeElement.querySelector('hr');
        expect(horizontal).toBeFalsy();
    });

    it('should apply type as class on root element', async () => {
        const { fixture, debugElement, component } = await setupDropdownComponent();
        component.type = 'force-position';
        component.ngOnInit();
        fixture.detectChanges();
        const root = debugElement.nativeElement.querySelector('div');
        expect(root.className).toBe('dropdown dropdown-' + component.type);
    });

    it('should apply forcePosition style to dropdown when forcePosition input exists', async () => {
        const { fixture, debugElement, component } = await setupDropdownComponent();
        component.forcePosition = { top: 20, left: 40, width: 200 };
        fixture.detectChanges();
        const dropdownMenu = debugElement.queryAll(By.css('.dropdown-menu'))[0];
        expect(dropdownMenu.nativeElement.style.left).toBe(component.forcePosition.left + 'px');
        expect(dropdownMenu.nativeElement.style.top).toBe(component.forcePosition.top + 'px');
        expect(dropdownMenu.nativeElement.style.width).toBe(component.forcePosition.width + 'px');
    });
});
