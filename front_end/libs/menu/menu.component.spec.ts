import { TestBed } from '@angular/core/testing';

import { NxSearchService } from '@app/services/search.service';

import { NxMenuComponent } from './menu.component';
import type { Content } from './menu.types';
import { setupComponent } from './src/setup';

const emptyMenu: Content = {
    base: '',
    selectedSection: '',
    level1: [],
};

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

export const menuContentFull: Content = {
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

const setup = async (content = emptyMenu): ReturnType<typeof setupComponent<NxMenuComponent>> => {
    const setup = await setupComponent(NxMenuComponent);

    setup.component.content = content;

    setup.component.ngOnChanges({
        content: {
            currentValue: content,
            previousValue: emptyMenu,
            firstChange: true,
            isFirstChange: () => true
        }
    });
    await setup.fixture.whenStable();
    return setup;
};

describe('NxMenuComponent', () => {
    it('should create the component', async () => {
        const { component } = await setup();
        expect(component).toBeTruthy();
        expect(component.menuContent.length).toBe(0); // menu not updated yet
    });

    it('should show placeholder', async () => {
        const { debugElement } = await setup();
        const placeholder = debugElement.nativeElement
            .querySelector('.nx-menu-placeholder');
        expect(placeholder).toBeTruthy();
        expect(placeholder.textContent.trim()).toBe('Nothing found');
    });

    describe('with full menu content', () => {
        it('should set menuContent', async () => {
            const { component } = await setup(menuContent);
            expect(component.menuContent.length).toBe(4); // level1 nodes
        });

        it('should hide placeholder', async () => {
            const { debugElement } = await setup(menuContent);
            const placeholder = debugElement.nativeElement.querySelector('.nx-menu-placeholder');
            expect(placeholder).toBeFalsy();
        });

        describe('level1 nodes', () => {
            it('should have level1 nodes', async () => {
                const { debugElement } = await setup(menuContent);
                const level1nodes = debugElement.nativeElement.querySelectorAll('.nx-menu nx-level-1-item');
                expect(level1nodes.length).toBe(4);
            });

            describe('Admin node', () => {
                it('should have level1 node', async () => {
                    const { debugElement } = await setup(menuContent);
                    const adminNodeContainer = debugElement.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLink = adminNodeContainer.querySelector('nx-level-1-item a');
                    const adminNodeText = adminNodeLink.querySelector('span');
                    const adminNodeIcon = adminNodeContainer.querySelector('nx-level-1-item a .menu-level-1-icon svg-icon');

                    expect(adminNodeLink.className).toContain('ellipsis selected');
                    expect(adminNodeText.textContent).toBe('System Administration');
                    expect(adminNodeIcon).toBeTruthy();
                });

                it('should have level3 nodes', async () => {
                    const { debugElement } = await setup(menuContent);
                    const adminNodeContainer = debugElement.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLevel3 = adminNodeContainer.querySelectorAll('nx-level-3-item');

                    expect(adminNodeLevel3.length).toBe(2);
                });

                it('should have level3 "General"', async () => {
                    const { debugElement } = await setup(menuContent);
                    const adminNodeContainer = debugElement.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLevel3 = adminNodeContainer.querySelectorAll('nx-level-3-item');
                    const general = adminNodeLevel3[0].querySelector('a');
                    const { textContent: label } = general
                        .querySelector('.menu-level-3-label');

                    expect(general.className).toContain('selected');
                    expect(general.id).toBe('general');
                    expect(label).toBe('General');
                });

                it('should have level3 "Licenses"', async () => {
                    const { debugElement } = await setup(menuContent);
                    const adminNodeContainer = debugElement.nativeElement.querySelector('.nx-menu .level-1-container');
                    const adminNodeLevel3 = adminNodeContainer.querySelectorAll('nx-level-3-item');
                    const licenses = adminNodeLevel3[1].querySelector('a');
                    const { textContent: label } = licenses
                        .querySelector('.menu-level-3-label');

                    expect(licenses.className).not.toContain('selected');
                    expect(licenses.id).toBe('licenses');
                    expect(label).toBe('Licenses');
                });

                it(
                    'should filter items',
                    async () => {
                        const { component, fixture, debugElement } = await setup(menuContentFull);
                        const searchService = TestBed.inject(NxSearchService);
                        component.menuModel.query = '192.168.5.10';
                        component.searchMode = true;
                        component.searchable = true;
                        searchService.getMatchPatterns(component.menuModel);
                        component.ngOnChanges({
                            content: {
                                currentValue: menuContentFull,
                                previousValue: menuContentFull,
                                firstChange: false,
                                isFirstChange: () => false
                            }
                        });
                        component.modelChanged(component.menuModel);
                        fixture.detectChanges();
                        await fixture.whenStable();

                        expect(component.menuContent.length).toBe(1);
                        expect(component.menuContent[0].id).toBe('cameras');
                        expect(component.menuContent[0].level3.length).toBe(1);
                        expect(component.menuContent[0].level3[0].additionalLabel)
                            .toBe('192.168.5.100');

                        const searchHighlight = debugElement.nativeElement
                            .querySelector(
                                '.menu-level-3-additional nx-search-highlight'
                            );
                        expect(searchHighlight.textContent).toBe('192.168.5.100');

                        // TODO: fix this test
                        // expect(searchHighlight.querySelector('highlighted').textContent)
                        //     .toBe('192.168.5.10');
                    }
                );
            });
        });
    });
});
