import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed,
    tick,
    fakeAsync
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AngularSvgIconModule } from 'angular-svg-icon';
import {
    MockProvider,
    MockDirective,
    MockModule,
    MockComponent,
} from 'ng-mocks';

import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxGenericDropdown } from './dropdown.component';
import type { DropdownItem } from './dropdown.component.types';
import { NxGenericDropdownItemSVG } from './item-icon/item-icon.component';

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
    let component: NxGenericDropdown;
    let fixture: ComponentFixture<NxGenericDropdown>;
    let el: DebugElement;
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

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                MockModule(AngularSvgIconModule),
                MockModule(PipesModule),
            ],
            declarations: [
                NxGenericDropdown,
                MockComponent(NxGenericDropdownItemSVG),
                MockDirective(NxArrowNavDirective),
            ],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxGenericDropdown);
                component = fixture.componentInstance;
                component.items = dropdownItems.slice();
                component.allowHTML = true;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should load 4 items', () => {
        fixture.detectChanges();
        const items = el.queryAll(By.css('.dropdown-item'));
        expect(items.length).toBe(4);
    });

    it('should have one disabled item', () => {
        fixture.detectChanges();
        const items = el.queryAll(By.css('.disabled'));
        expect(items.length).toBe(2);
    });

    it('should NOT have ellipsis-mr class if NOT merge or ellipsisMargin', () => {
        fixture.detectChanges();
        const items = el.queryAll(By.css('.ellipsis-mr'));
        expect(items.length).toBe(0);
    });

    it('should have ellipsis-mr class if merge', () => {
        component.merge = true;
        fixture.detectChanges();
        const items = el.queryAll(By.css('.ellipsis-mr'));
        expect(items.length).toBe(1);
    });

    it('should have ellipsis-mr class if ellipsisMargin', () => {
        component.ellipsisMargin = true;
        fixture.detectChanges();
        const items = el.queryAll(By.css('.ellipsis-mr'));
        expect(items.length).toBe(1);
    });

    it('should not have dot1 class if not loading', () => {
        fixture.detectChanges();
        const items = el.queryAll(By.css('.dot1'));
        expect(items.length).toBe(0);
    });

    it('should have dot1 class if loading', () => {
        component.stillLoading = true;
        fixture.detectChanges();
        const items = el.queryAll(By.css('.dot1'));
        expect(items.length).toBe(1);
    });

    it('should have an item selected', fakeAsync(() => {
        fixture.detectChanges();
        const toggle = el.queryAll(By.css('.btn-dropdown-toggle'));
        click(toggle[0]);
        fixture.detectChanges();
        tick();
        const items = el.queryAll(By.css('.dropdown-item'));
        click(items[2]);
        fixture.detectChanges();
        tick();
        const selectedPostClick = el.nativeElement.querySelector('button.dropdown-toggle span');
        expect(selectedPostClick.innerHTML).toContain('helpText4');
    }));

    it('should have additional-help class if help item exists', () => {
        fixture.detectChanges();
        const helpClass = el.queryAll(By.css('.additional-help'));
        expect(helpClass.length).toBe(1);
    });

    it('should NOT have additional-help class if NO help item exists', () => {
        component.items = component.items.filter(item => !item.help);
        fixture.detectChanges();
        const helpClass = el.queryAll(By.css('.additional-help'));
        expect(helpClass.length).toBe(0);
    });

    it('should set show to true on dropdown button click', fakeAsync(() => {
        component.show = false;
        const btnDropdownToggle = el.queryAll(By.css('.btn-dropdown-toggle'));
        click(btnDropdownToggle[0]);
        fixture.detectChanges();
        tick();
        expect(component.show).toBeTruthy();
    }));

    it('should show dropdown-menu if show = true', () => {
        component.show = true;
        fixture.detectChanges();
        const dropdownMenu = el.queryAll(By.css('.dropdown-show'));
        expect(dropdownMenu.length).toBe(1);
    });

    it('should NOT show dropdown-menu if show = false', () => {
        component.show = false;
        fixture.detectChanges();
        const dropdownMenu = el.queryAll(By.css('.dropdown-show'));
        expect(dropdownMenu.length).toBe(0);
    });

    it('should load horizontal div if item with horizontal name exists', () => {
        fixture.detectChanges();
        const horizontal = el.nativeElement.querySelector('hr');
        expect(horizontal).toBeTruthy();
    });

    it('should NOT load horizontal div if NO item with horizontal name exists', () => {
        component.items = component.items.filter(item => item.name !== 'horizontal');
        fixture.detectChanges();
        const horizontal = el.nativeElement.querySelector('hr');
        expect(horizontal).toBeFalsy();
    });

    it('should apply type as class on root element', () => {
        component.type = 'force-position';
        fixture.detectChanges();
        const root = el.nativeElement.querySelector('div');
        expect(root.className).toBe('dropdown dropdown-' + component.type);
    });

    it('should apply forcePosition style to dropdown when forcePosition input exists', () => {
        component.forcePosition = { top: 20, left: 40, width: 200 };
        fixture.detectChanges();
        const dropdownMenu = el.queryAll(By.css('.dropdown-menu'))[0];
        expect(dropdownMenu.nativeElement.style.left).toBe(component.forcePosition.left + 'px');
        expect(dropdownMenu.nativeElement.style.top).toBe(component.forcePosition.top + 'px');
        expect(dropdownMenu.nativeElement.style.width).toBe(component.forcePosition.width + 'px');
    });
});
