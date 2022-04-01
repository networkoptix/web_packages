import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider, MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { BehaviorSubject, Observable } from 'rxjs';

import { NxDropMenu } from '@components/dropdowns/drop-menu/drop-menu.component';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxUriService } from '@services/uri.service';

import { NxHeaderMainButtonComponent } from './main-button.component';

describe('NxHeaderMainButtonComponent', () => {
    let component: NxHeaderMainButtonComponent;
    let fixture: ComponentFixture<NxHeaderMainButtonComponent>;
    let el: DebugElement;

    const headerMock = {
        currentLocation: {
            path: 'testUrl',
            isSystem: false
        },
        showSubject: new BehaviorSubject(true),
        activeSystem: {
            name: 'activeSystemName'
        },
        lastActive$: new BehaviorSubject(true)
    };
    const menusMock = {
        currentSystemNode$: new BehaviorSubject(null),
        getMenu: () => new Observable(null),
        updateActiveSystemMenu: () => {}
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
        name_raw: 'nameRaw'
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxHeaderMainButtonComponent,
                MockComponent(NxDropMenu),
                MockDirective(NxArrowNavDirective)
            ],
            imports: [
                MockModule(CommonModule),
                MockModule(AngularSvgIconModule),
                MockModule(HttpClientTestingModule),
                MockModule(RouterTestingModule),
            ],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                MockProvider(NxAccountService),
                MockProvider(NxUriService),
                { provide: NxHeaderService, useValue: headerMock },
                { provide: NxMenusService, useValue: menusMock }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxHeaderMainButtonComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
                component.node = node;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show the base component', () => {
        component.node = undefined;
        fixture.detectChanges();
        const dropdown = el.nativeElement.querySelector('div.dropdown');
        expect(dropdown.className).toContain('show');
        const button = el.nativeElement.querySelectorAll('button');
        expect(button.length).toBe(1);
        expect(el.nativeElement.querySelectorAll('svg-icon').length).toBe(2);
        expect(el.nativeElement.querySelector('span').innerText).toBe('All Site');
    });

    it('should show node state', () => {
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('span').innerText).toBe(node.display_name);
    });

    it('should show system state for active system', () => {
        headerMock.currentLocation.isSystem = true;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('span').innerText).toBe('activeSystemName');
    });

    it('should show system state for webadmin', () => {
        Object.defineProperty(
            component,
            'environment',
            { value: { ...component.environment, isLocal: true } }
        );
        headerMock.currentLocation.isSystem = false;
        headerMock.activeSystem = {
            name: undefined
        };
        fixture.detectChanges();
        const span: HTMLSpanElement = el.nativeElement.querySelector('span');
        expect(span.classList).toContain('ellipsis');
        expect(span.innerText).toBe(node.display_name);
    });

    it('should show systems state', () => {
        Object.defineProperty(
            component,
            'environment',
            { value: { ...component.environment, isLocal: false } }
        );
        component.systems = [{}, {}, {}];
        headerMock.currentLocation.isSystem = true;
        headerMock.activeSystem = undefined;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('span').innerText).toBe('3\xa0Systems');
        // \xa0 = nonbreaking space
    });

    it('should not have show class', () => {
        headerMock.showSubject.next(false);
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('div.dropdown').className).not.toContain('show');
    });
});
