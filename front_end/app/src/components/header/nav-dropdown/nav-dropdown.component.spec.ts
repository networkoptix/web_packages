import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxHeaderService } from '@services/nx-header.service';
import { WINDOW } from '@services/window-provider';
import { NxNavDropdownComponent } from './nav-dropdown.component';

import { AngularSvgIconModule } from 'angular-svg-icon';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';

describe('NxNavDropdownComponent', () => {
    let component: NxNavDropdownComponent;
    let fixture: ComponentFixture<NxNavDropdownComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {
            pleaseSelect: () => 'Please select'
        }
    };
    const configMock = { getConfig: () => nxConfig };
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
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: NxHeaderService, useValue: {} },
                { provide: WINDOW, useValue: window }
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
