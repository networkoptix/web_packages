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
import { MockProvider } from 'ng-mocks';

import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxConfigService } from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { WINDOW } from '@services/window-provider';

import { NxNavDropdownComponent } from './nav-dropdown.component';

describe('NxNavDropdownComponent', () => {
    let component: NxNavDropdownComponent;
    let fixture: ComponentFixture<NxNavDropdownComponent>;
    let el: DebugElement;

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
                name_raw: 'innerNameRaw'
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
                name_raw: 'innerNameRaw2'
            }
        ],
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
            declarations: [NxNavDropdownComponent, NxArrowNavDirective],
            imports: [
                CommonModule,
                AngularSvgIconModule.forRoot(),
                HttpClientTestingModule,
                RouterTestingModule
            ],
            providers: [
                MockProvider(NxLanguageProviderService),
                MockProvider(NxConfigService),
                MockProvider(NxHeaderService),
                MockProvider(WINDOW)
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxNavDropdownComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
                fixture.detectChanges();
                component.dropdownNode = dropdownNode;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should set up basic component', () => {
        fixture.detectChanges();
        const button = el.nativeElement.querySelectorAll('button');
        expect(button.length).toBe(1);
        expect(button[0].innerText).toBe(dropdownNode.display_name);
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
        const dropdown = el.nativeElement.querySelector('ul.dropdown-menu');
        expect(dropdown.style.display).toBe('none');
        const dropdownItems = el.nativeElement.querySelectorAll('li.dropdown-item-container');
        expect(dropdownItems.length).toBe(2);
        const nodeNames = el.nativeElement.querySelectorAll('span');
        expect(nodeNames.length).toBe(2);
        expect(nodeNames[0].innerText).toBe(dropdownNode.nodes[0].name);
        expect(nodeNames[1].innerText).toBe(dropdownNode.nodes[1].name);
        const arrowUp = el.nativeElement.querySelectorAll('div.popup');
        expect(arrowUp.length).toBe(0);
    });

    it('should show dropdown items', () => {
        component.show = true;
        fixture.detectChanges();
        const button = el.nativeElement.querySelectorAll('button');
        expect(button.length).toBe(1);
        expect(button[0].innerText).toBe(dropdownNode.display_name);
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
        const dropdown = el.nativeElement.querySelector('ul.dropdown-menu');
        expect(dropdown.style.display).toBe('inline-block');
        const dropdownItems = el.nativeElement.querySelectorAll('li.dropdown-item-container');
        expect(dropdownItems.length).toBe(2);
        const arrowUp = el.nativeElement.querySelectorAll('div.popup');
        expect(arrowUp.length).toBe(1);
    });
});
