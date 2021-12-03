import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';

import { NxMenusService } from '@services/menus.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxConfigService } from '@services/nx-config';

import { NxFooterComponent } from './footer.component';

describe('NxFooterComponent', () => {
    let component: NxFooterComponent;
    let fixture: ComponentFixture<NxFooterComponent>;
    let el: DebugElement;

    const footers = [
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
    ];

    const menuMock = {
        getMenu: () => of({
            nodes: footers
        }),
        cleanEmptyNodes: (footer: any) => footer
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxFooterComponent],
            imports: [
                CommonModule,
                TranslateModule.forRoot(),
                RouterTestingModule
            ],
            providers: [
                MockProvider(DomSanitizer),
                MockProvider(NxConfigService),
                MockProvider(NxAppStateService),
                { provide: NxMenusService, useValue: menuMock }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxFooterComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should set up the basic component', () => {
        fixture.detectChanges();
        const links = el.nativeElement.querySelectorAll('a');
        expect(links.length).toBe(3);
        expect(links[0].innerText).toBe(footers[0].display_name);
        expect(links[1].innerText).toBe(footers[1].display_name);
        expect(links[2].className).toContain('copyright');
        expect(links[2].innerHTML).toBe('©&nbsp;Nx Cloud');
    });
});
