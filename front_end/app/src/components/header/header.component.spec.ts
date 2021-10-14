import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { DebugElement, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BehaviorSubject, of } from 'rxjs';

import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxAccountService } from '@services/account.service';
import { NxSessionService } from '@services/session.service';
import { NxSystemsService } from '@services/systems.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxSystemService } from '@services/system.service';
import { NxMenusService } from '@services/menus.service';
import { WINDOW } from '@services/window-provider';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxStorageService } from '@services/storage.service';
import { NxHeaderComponent } from './header.component';

import { NxNavDropdownComponent } from '@components/header/nav-dropdown/nav-dropdown.component';
import { NxAccountSettingsDropdown } from '@components/dropdowns/account-settings/account-settings.component';
import { NxHeaderLanguageDropdown } from '@components/dropdowns/language/language.component';
import { NxDropMenu } from '@components/dropdowns/drop-menu/drop-menu.component';
import { NxUriService } from '@services/uri.service';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { LocalStorageService } from 'ngx-webstorage';
import { RouterTestingModule } from '@angular/router/testing';

describe('NxHeaderComponent', () => {
    let component: NxHeaderComponent;
    let fixture: ComponentFixture<NxHeaderComponent>;
    let el: DebugElement;

    const translateMock = {
        translations: {
            pleaseSelect: () => 'Please select'
        }
    };
    const configMock = { getConfig: () => nxConfig };
    const menuMock = {
        getMenu: () => of({
            description : '',
            title       : '',
            nodes       : [
                {
                    accepted          : true,
                    asset_id          : null,
                    asset_type        : null,
                    authentication    : 'Both',
                    breadcrumbs       : [],
                    display_name      : 'For Developers',
                    draft             : null,
                    icon              : '',
                    name              : 'For Developers',
                    name_raw          : 'For Developers',
                    new_window        : false,
                    next_item         : false,
                    nodes             : [],
                    order             : 0,
                    pending           : false,
                    related_asset_ids : [],
                    subtitle          : '',
                    url               : ''
                },
                {
                    accepted          : true,
                    asset_id          : null,
                    asset_type        : null,
                    authentication    : 'Both',
                    breadcrumbs       : [],
                    display_name      : 'Services',
                    draft             : null,
                    icon              : 'services.svg',
                    name              : 'Services',
                    name_raw          : 'Services',
                    new_window        : false,
                    next_item         : false,
                    nodes             : [],
                    order             : 1,
                    pending           : false,
                    related_asset_ids : [],
                    subtitle          : '',
                    url               : ''
                }
            ]
        }),
        cleanEmptyNodes: (header: any) => header.nodes
    };
    const routeMock = {
        queryParams: of({})
    };
    // const routerMock = {
    //     url    : '',
    //     events : of('')
    // };
    const headerMock = {
        systemIdSubject : of(''),
        currentLocation : {}
    };
    const sessionMock = {
        loginStateSubject: of('')
    };
    const accountMock = {
        get            : () => Promise.resolve({ email: 'testEmail@co.co' }),
        accountSubject : new BehaviorSubject(null)
    };
    const systemsMock = {
        getSystem          : () => {},
        forceUpdateSystems : () => Promise.resolve('systemUpdated'),
        systemsSubject     : of([])
    };
    const storageMock = {
        systemId: 'testSystemId'
    };
    const appStateMock = {
        headerVisibleSubject: of(true)
    };
    const cloudMock = {
        getLanguages: () => Promise.resolve()
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxHeaderComponent,
                NxNavDropdownComponent,
                NxAccountSettingsDropdown,
                NxHeaderLanguageDropdown,
                NxDropMenu,
                NxArrowNavDirective
            ],
            imports: [
                CommonModule,
                AngularSvgIconModule.forRoot(),
                HttpClientTestingModule,
                RouterTestingModule
            ],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                Renderer2,
                { provide: NxAppStateService, useValue: appStateMock },
                { provide: ActivatedRoute, useValue: routeMock },
                { provide: NxSystemsService, useValue: systemsMock },
                { provide: NxSystemService, useValue: {} },
                { provide: NxDialogsService, useValue: {} },
                { provide: NxAccountService, useValue: accountMock },
                { provide: NxSessionService, useValue: sessionMock },
                { provide: NxStorageService, useValue: storageMock },
                // { provide: Router, useValue: routerMock },
                { provide: NxHeaderService, useValue: headerMock },
                { provide: NxMenusService, useValue: menuMock },
                { provide: WINDOW, useValue: window },
                { provide: NxBootstrapProvider, useValue: {} },
                { provide: NxUriService, useValue: {} },
                { provide: NxCloudApiService, useValue: cloudMock },
                { provide: LocalStorageService, useValue: {} }
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
