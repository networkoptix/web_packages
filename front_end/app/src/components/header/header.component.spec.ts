import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement, Renderer2 } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider, MockModule, MockComponent, MockDirective } from 'ng-mocks';
import { of } from 'rxjs';

import {
    NxAccountSettingsDropdown
} from '@components/dropdowns/account-settings/account-settings.component';
import {
    NxHeaderLanguageDropdown
} from '@components/dropdowns/language/language.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService } from '@services/session.service';
import { NxStorageService } from '@services/storage.service';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';
import { NxUnsafePipe } from '@src/pipes/nx-unsafe';

import { NxHeaderComponent } from './header.component';
import { NxNavDropdownComponent } from './nav-dropdown/nav-dropdown.component';

describe('NxHeaderComponent', () => {
    let component: NxHeaderComponent;
    let fixture: ComponentFixture<NxHeaderComponent>;
    let el: DebugElement;

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
                    url: ''
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
                    url: ''
                }
            ]
        }),
        cleanEmptyNodes: (header: any) => header.nodes
    };
    const headerMock = {
        systemIdSubject: of(''),
        currentLocation: {},
        setLocation: () => {}
    };
    const appStateMock = {
        headerVisibleSubject: of(true)
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxHeaderComponent,
                MockComponent(NxNavDropdownComponent),
                MockComponent(NxAccountSettingsDropdown),
                MockComponent(NxHeaderLanguageDropdown),
                MockDirective(NxUnsafePipe)
            ],
            imports: [
                MockModule(CommonModule),
                MockModule(AngularSvgIconModule),
                HttpClientTestingModule,
                RouterTestingModule
            ],
            providers: [
                MockProvider(NxConfigService),
                MockProvider(NxLanguageProviderService),
                MockProvider(Renderer2),
                { provide: NxAppStateService, useValue: appStateMock },
                MockProvider(NxSystemsService),
                MockProvider(NxSystemService),
                MockProvider(NxDialogsService),
                MockProvider(NxAccountService),
                MockProvider(NxSessionService),
                MockProvider(NxStorageService),
                { provide: NxHeaderService, useValue: headerMock },
                { provide: NxMenusService, useValue: menuMock },
                { provide: WINDOW, useValue: window },
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxHeaderComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should load basic component - not logged in', () => {
        fixture.detectChanges();
        expect(el.nativeElement.querySelectorAll('.invisible').length).toBe(0);
        expect(el.nativeElement.querySelector('header')).toBeTruthy();
        const navbarLeft = el.nativeElement.querySelectorAll('.app-header-left .navbar-nav');
        expect(navbarLeft.length).toBe(2);
        const navbarRight = el.nativeElement.querySelectorAll('.app-header-right .navbar-nav');
        expect(navbarRight.length).toBe(3);
        const icons = el.nativeElement.querySelectorAll('img');
        expect(icons.length).toBe(2);
    });

    it('should show links - not logged in', () => {
        fixture.detectChanges();
        const links = el.nativeElement.querySelectorAll('a');
        expect(links.length).toBe(8);
        expect(links[1].innerText).toBe('Create Account');
        expect(links[2].innerText).toBe('Log In');
    });

    it('should load basic webadmin component - not logged in', () => {
        component.hideWebAdmin = true;
        fixture.detectChanges();
        expect(el.nativeElement.querySelectorAll('.invisible').length).toBe(2);
        expect(el.nativeElement.querySelector('header')).toBeTruthy();
        const navbarLeft = el.nativeElement.querySelectorAll('.app-header-left .navbar-nav');
        expect(navbarLeft.length).toBe(2);
        const navbarRight = el.nativeElement.querySelectorAll('.app-header-right .navbar-nav');
        expect(navbarRight.length).toBe(3);
        const icons = el.nativeElement.querySelectorAll('img');
        expect(icons.length).toBe(2);
    });
});
