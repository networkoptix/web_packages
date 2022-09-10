import { ElementRef, Renderer2 } from '@angular/core';
import {
    ComponentFixture,
    inject,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider, MockModule, MockComponent } from 'ng-mocks';

import { NxSearchComponent } from '@components/search/search.component';
import { NxApplyService } from '@services/apply.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSearchService } from '@services/search.service';
import { WINDOW } from '@services/window-provider';
import { NxSafePipe } from '@app/pipes/nx-safe';

import { NxLevel1ItemComponent } from './level-1/level-1-item.component';
import { NxLevel3ItemComponent } from './level-3/level-3-item.component';
import { NxMenuComponent } from './menu.component';
import { NxMenuService } from './menu.service';
import type { Content } from './menu.types';

describe('NxMenuComponent', () => {
    let component: NxMenuComponent;
    let fixture: ComponentFixture<NxMenuComponent>;
    let el: ElementRef<HTMLElement>;

    const menuContent: Content = {
        base: '/systems/23325fac-434e-4fe5-b254-8d7e4f7522d0',
        level1: [
            {
                id: 'admin',
                svg: 'systems',
                label: 'System Administration',
                path: '',
                level2: [],
                level3: [
                    {
                        id: 'general',
                        label: 'General',
                        path: '/'
                    },
                    {
                        id: 'licenses',
                        label: 'Licenses',
                        path: 'licenses'
                    }
                ]
            },
            {
                id: 'cameras',
                svg: 'cameras',
                label: 'Cameras',
                path: 'cameras',
                level3: []
            },
            {
                id: 'users',
                svg: 'users',
                label: 'Users',
                path: 'users',
                level2: [{
                    id: 'buttons',
                    items: [{
                        id: 'addUser',
                        label: 'Add User',
                        disabled: true
                    }],
                    level3: []
                }],
                level3: []
            },
            {
                id: 'servers',
                svg: 'servers',
                label: 'Servers',
                path: 'servers/a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393',
                level3: []
            }
        ],
        selectedDetailsSection: 'general',
        selectedSection: 'admin',
        selectedSubSection: ''
    };

    const menuContentFull: Content = {
        base: '/systems/23325fac-434e-4fe5-b254-8d7e4f7522d0',
        level1: [
            {
                id: 'admin',
                svg: 'systems',
                label: 'System Administration',
                path: '',
                level2: [],
                level3: [
                    {
                        id: 'general',
                        label: 'General',
                        path: '/'
                    },
                    {
                        id: 'licenses',
                        label: 'Licenses',
                        path: 'licenses'
                    }
                ]
            },
            {
                id: 'cameras',
                svg: 'cameras',
                label: 'Cameras',
                path: 'cameras',
                level3: [
                    {
                        id: 'f2265688-130d-2535-0e25-5d5437ffe6bc',
                        svgIcon: 'camera_unauthorized',
                        disabled: true,
                        label: '🐛',
                        indent: true,
                        path: 'cameras/f2265688-130d-2535-0e25-5d5437ffe6bc',
                        additionalLabel: '192.168.5.100'
                    },
                    {
                        id: '28211a91-4d61-e6b9-da49-172c127da68b',
                        svgIcon: 'camera_recording',
                        disabled: false,
                        label: '💉',
                        indent: true,
                        path: 'cameras/28211a91-4d61-e6b9-da49-172c127da68b',
                        additionalLabel: '192.168.5.56'
                    },
                    {
                        id: '786086a2-0cef-a2db-7c76-eba5207927ea',
                        svgIcon: '',
                        disabled: false,
                        label: '😷',
                        indent: true,
                        path: 'cameras/786086a2-0cef-a2db-7c76-eba5207927ea',
                        additionalLabel: '10.1.5.207'
                    },
                    {
                        id: '162ff0a3-32fd-e049-f037-2ee378df5a8b',
                        svgIcon: 'camera_unauthorized',
                        disabled: true,
                        label: '🦆',
                        indent: true,
                        path: 'cameras/162ff0a3-32fd-e049-f037-2ee378df5a8b',
                        additionalLabel: '10.1.5.178'
                    },
                    {
                        id: 'b9544f11-e84a-9c1d-c58d-320d6898f9bd',
                        svgIcon: 'camera_recording',
                        disabled: false,
                        label: '🦠',
                        indent: true,
                        path: 'cameras/b9544f11-e84a-9c1d-c58d-320d6898f9bd',
                        additionalLabel: '10.1.5.116'
                    },
                    {
                        id: '2375d7f9-4372-adc2-07a4-ade8ff55052e',
                        svgIcon: 'camera_unauthorized',
                        disabled: true,
                        label: '🪲',
                        indent: true,
                        path: 'cameras/2375d7f9-4372-adc2-07a4-ade8ff55052e',
                        additionalLabel: '10.1.5.168'
                    },
                    {
                        id: '1b8be533-0015-766a-9587-06af266b5881',
                        svgIcon: 'camera_unauthorized',
                        disabled: true,
                        label: '🪳',
                        indent: true,
                        path: 'cameras/1b8be533-0015-766a-9587-06af266b5881',
                        additionalLabel: '10.1.5.150'
                    }
                ]
            },
            {
                id: 'users',
                svg: 'users',
                label: 'Users',
                path: 'users',
                level2: [{
                    id: 'buttons',
                    items: [{
                        id: 'addUser',
                        label: 'Add User',
                        disabled: true
                    }],
                    level3: []
                }],
                level3: [
                    {
                        additionalLabel: 'Administrator',
                        id: '2ab67cb3-002a-4ab9-abb3-80978a7f6dff',
                        disabled: false,
                        label: 'ckang@networkoptix.com',
                        path: 'users/2ab67cb3-002a-4ab9-abb3-80978a7f6dff',
                        svgIcon: '',
                        icon: 'glyphicon-cloud'
                    },
                    {
                        additionalLabel: 'Administrator',
                        id: '19334c4c-7dd6-49e9-bbec-efd484ce3d3e',
                        disabled: false,
                        label: 'czach@networkoptix.com',
                        path: 'users/19334c4c-7dd6-49e9-bbec-efd484ce3d3e',
                        svgIcon: '',
                        icon: 'glyphicon-cloud'
                    },
                    {
                        additionalLabel: 'Administrator',
                        id: '9a37fa8c-7603-458b-819a-4087c49c046f',
                        disabled: false,
                        label: 'iartemchuk@networkoptix.com',
                        path: 'users/9a37fa8c-7603-458b-819a-4087c49c046f',
                        svgIcon: '',
                        icon: 'glyphicon-cloud'
                    },
                    {
                        additionalLabel: 'Administrator',
                        id: 'fe193403-3358-4996-a3bd-6622870a45df',
                        disabled: false,
                        label: 'nhartleb@networkoptix.com',
                        path: 'users/fe193403-3358-4996-a3bd-6622870a45df',
                        svgIcon: '',
                        icon: 'glyphicon-cloud'
                    },
                    {
                        additionalLabel: 'Administrator',
                        id: '921e06e2-592f-45dd-8605-35e054d0de11',
                        disabled: false,
                        label: 'rbarsegian@networkoptix.com',
                        path: 'users/921e06e2-592f-45dd-8605-35e054d0de11',
                        svgIcon: '',
                        icon: 'glyphicon-cloud'
                    },
                    {
                        additionalLabel: 'Owner',
                        id: 'c5720c31-97d8-442b-9583-da050cb6ce8c',
                        disabled: false,
                        label: 'ttsolov@networkoptix.com',
                        path: 'users/c5720c31-97d8-442b-9583-da050cb6ce8c',
                        svgIcon: '',
                        icon: 'glyphicon-cloud'
                    }
                ]
            },
            {
                id: 'servers',
                svg: 'servers',
                label: 'Servers',
                path: 'servers/a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393',
                level3: [{
                    id: '{a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393}',
                    svgIcon: '',
                    label: 'Server Sofia',
                    path: 'servers/a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393',
                    additionalLabel: '192.168.5.5',
                    indent: true,
                    disabled: false
                }]
            }
        ],
        selectedDetailsSection: 'general',
        selectedSection: 'admin',
        selectedSubSection: ''
    };

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                imports: [
                    MockModule(AngularSvgIconModule),
                    RouterTestingModule,
                    TranslateModule.forRoot(),
                ],
                declarations: [
                    NxMenuComponent,
                    NxLevel1ItemComponent,
                    NxLevel3ItemComponent,
                    NxSafePipe,
                    MockComponent(NxSearchComponent),
                ],
                providers: [
                    MockProvider(Renderer2),
                    MockProvider(NxApplyService),
                    MockProvider(NxConfigService),
                    MockProvider(NxLanguageProviderService),
                    MockProvider(WINDOW),
                    NxSearchService,
                    NxMenuService,
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxMenuComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;

        component.content = menuContent;
        fixture.detectChanges();
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
        expect(component.menuContent.length).toBe(0); // menu not updated yet
    });

    it('should show placeholder', () => {
        const placeholder = el.nativeElement
            .querySelector<HTMLDivElement>('.nx-menu-placeholder');
        expect(placeholder).toBeTruthy();
        expect(placeholder.innerText).toBe('Nothing found');
    });

    describe('with full menu content', () => {
        beforeEach(waitForAsync(() => {
            component.ngOnChanges({
                content: {
                    currentValue: menuContentFull,
                    previousValue: null,
                    firstChange: true,
                    isFirstChange: () => true
                }
            });
            fixture.detectChanges();
        }));

        it('should set menuContent', () => {
            expect(component.menuContent.length).toBe(4); // level1 nodes
        });

        it('should hide placeholder', () => {
            const placeholder = el.nativeElement.querySelector('.nx-menu-placeholder');
            expect(placeholder).toBeFalsy();
        });

        describe('level1 nodes', () => {
            it('should have level1 nodes', () => {
                const level1nodes = el.nativeElement.querySelectorAll('.nx-menu nx-level-1-item');
                expect(level1nodes.length).toBe(4);
            });

            describe('Admin node', () => {
                it('should have level1 node', () => {
                    const adminNodeContainer = el.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLink = adminNodeContainer.querySelector('nx-level-1-item a');
                    const adminNodeText = adminNodeLink.querySelector('span');
                    const adminNodeIcon = adminNodeContainer.querySelector('nx-level-1-item a .menu-level-1-icon svg-icon');

                    expect(adminNodeLink.className).toContain('ellipsis selected');
                    expect(adminNodeText.innerText).toBe('System Administration');
                    expect(adminNodeIcon).toBeTruthy();
                });

                it('should have level3 nodes', () => {
                    const adminNodeContainer = el.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLevel3 = adminNodeContainer.querySelectorAll('nx-level-3-item');

                    expect(adminNodeLevel3.length).toBe(2);
                });

                it('should have level3 "General"', () => {
                    const adminNodeContainer = el.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLevel3 = adminNodeContainer.querySelectorAll('nx-level-3-item');
                    const general = adminNodeLevel3[0].querySelector('a');
                    const { innerText: label } = general
                        .querySelector<HTMLSpanElement>('.menu-level-3-label');

                    expect(general.className).toContain('selected');
                    expect(general.id).toBe('general');
                    expect(label).toBe('General');
                });

                it('should have level3 "Licenses"', () => {
                    const adminNodeContainer = el.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLevel3 = adminNodeContainer.querySelectorAll('nx-level-3-item');
                    const licenses = adminNodeLevel3[1].querySelector('a');
                    const { innerText: label } = licenses
                        .querySelector<HTMLSpanElement>('.menu-level-3-label');

                    expect(licenses.className).not.toContain('selected');
                    expect(licenses.id).toBe('licenses');
                    expect(label).toBe('Licenses');
                });

                it('should filter items',
                    inject([NxSearchService], (searchService: NxSearchService) => {
                        component.searchable = true;
                        component.menuModel.query = '192.168.5.10';
                        component.searchMode = true;
                        component.searchable = true;
                        searchService.getMatchPatterns(component.menuModel);
                        component.modelChanged(component.menuModel);

                        expect(component.menuContent.length).toBe(1);
                        expect(component.menuContent[0].id).toBe('cameras');
                        expect(component.menuContent[0].level3.length).toBe(1);
                        expect(component.menuContent[0].level3[0].additionalLabel)
                            .toBe('<span class="highlighted">192.168.5.10</span>0');
                    }));
            });
        });
    });
});
