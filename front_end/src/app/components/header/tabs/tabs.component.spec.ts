import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { NxHeaderService } from '@services/nx-header.service';

import { NxTabsComponent } from './tabs.component';

describe('NxTabsComponent', () => {
    let component: NxTabsComponent;
    let fixture: ComponentFixture<NxTabsComponent>;
    let el: DebugElement;

    const headerMock = {
        currentLocation: {
            path: 'testUrl'
        }
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxTabsComponent],
            imports: [CommonModule, RouterTestingModule],
            providers: [
                { provide: NxHeaderService, useValue: headerMock }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxTabsComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
                component.node = {
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
                    invisible: false
                };
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should set up basic component', () => {
        expect(el.nativeElement.querySelector('li.tab-link')).toBeFalsy();
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('li.tab-link')).toBeTruthy();
        expect(el.nativeElement.querySelector('.active')).toBeTruthy();
        expect(el.nativeElement.querySelector('a').innerText).toBe('nodeName');
    });

    it('should not show if new window', () => {
        component.node.new_window = true;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('li.tab-link')).toBeFalsy();
    });

    it('should not have active class if not current url', () => {
        component.node.url = 'notTestUrl';
        component.node.new_window = true;
        fixture.detectChanges();
        expect(el.nativeElement.querySelector('.active')).toBeFalsy();
    });
});
