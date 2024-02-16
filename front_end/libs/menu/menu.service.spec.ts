import { inject, TestBed, waitForAsync } from '@angular/core/testing';

import { NxSearchService } from '@services/search.service';

import { NxMenuService } from './menu.service';
import type { Level1Item, Level3Item } from './menu.types';

describe('NxMenuService', () => {
    const menuContent: Level1Item[] = [
        {
            id: 'admin',
            svg: 'systems',
            label: 'System Administration',
            path: '',
            level2: [],
            level3: [
                {
                    id: 'general',
                    label: '<b>General</b>',
                    path: '/',
                },
                {
                    id: 'licenses',
                    label: 'Licenses',
                    path: 'licenses',
                },
            ],
            toggle: false,
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
                    label: '🐛 ',
                    indent: true,
                    path: 'cameras/f2265688-130d-2535-0e25-5d5437ffe6bc',
                    additionalLabel: '192.168.5.100',
                },
                {
                    id: '28211a91-4d61-e6b9-da49-172c127da68b',
                    svgIcon: 'camera_recording',
                    disabled: false,
                    label: '💉',
                    indent: true,
                    path: 'cameras/28211a91-4d61-e6b9-da49-172c127da68b',
                    additionalLabel: '192.168.5.56',
                },
                {
                    id: '786086a2-0cef-a2db-7c76-eba5207927ea',
                    svgIcon: '',
                    disabled: false,
                    label: '😷',
                    indent: true,
                    path: 'cameras/786086a2-0cef-a2db-7c76-eba5207927ea',
                    additionalLabel: '10.1.5.207',
                },
                {
                    id: '162ff0a3-32fd-e049-f037-2ee378df5a8b',
                    svgIcon: 'camera_unauthorized',
                    disabled: true,
                    label: '🦆',
                    indent: true,
                    path: 'cameras/162ff0a3-32fd-e049-f037-2ee378df5a8b',
                    additionalLabel: '10.1.5.178',
                },
                {
                    id: 'b9544f11-e84a-9c1d-c58d-320d6898f9bd',
                    svgIcon: 'camera_recording',
                    disabled: false,
                    label: '🦠',
                    indent: true,
                    path: 'cameras/b9544f11-e84a-9c1d-c58d-320d6898f9bd',
                    additionalLabel: '10.1.5.116',
                },
                {
                    id: '2375d7f9-4372-adc2-07a4-ade8ff55052e',
                    svgIcon: 'camera_unauthorized',
                    disabled: true,
                    label: '🪲',
                    indent: true,
                    path: 'cameras/2375d7f9-4372-adc2-07a4-ade8ff55052e',
                    additionalLabel: '10.1.5.168',
                },
                {
                    id: '1b8be533-0015-766a-9587-06af266b5881',
                    svgIcon: 'camera_unauthorized',
                    disabled: true,
                    label: '🪳',
                    indent: true,
                    path: 'cameras/1b8be533-0015-766a-9587-06af266b5881',
                    additionalLabel: '10.1.5.150',
                },
            ],
            toggle: false,
        },
        {
            id: 'users',
            svg: 'users',
            label: 'Users',
            path: 'users',
            level2: [
                {
                    id: 'buttons',
                    items: [{ id: 'addUser', label: 'Add User', disabled: false }],
                    level3: [],
                },
            ],
            level3: [
                {
                    additionalLabel: 'Owner',
                    id: '99cbc715-539b-4bfe-856f-799b45b69b1e',
                    disabled: false,
                    label: 'admin',
                    path: 'users/99cbc715-539b-4bfe-856f-799b45b69b1e',
                    svgIcon: 'user',
                },
                {
                    additionalLabel: 'Live Viewer',
                    id: 'fed50f90-c3a1-4178-9786-9e10a64d3eb6',
                    disabled: false,
                    label: 'liveviewer',
                    path: 'users/fed50f90-c3a1-4178-9786-9e10a64d3eb6',
                    svgIcon: 'user',
                },
                { horizontal: true } as Level3Item,
                {
                    additionalLabel: 'Administrator',
                    id: 'a7e2631e-389d-01e7-131f-9ecdee4e0aad',
                    disabled: false,
                    label: 'ckang@networkoptix.com',
                    path: 'users/a7e2631e-389d-01e7-131f-9ecdee4e0aad',
                    svgIcon: '',
                    icon: 'glyphicon-cloud',
                },
                {
                    additionalLabel: 'Administrator',
                    id: '329a88b1-df06-2871-5cde-15a50be17743',
                    disabled: false,
                    label: 'czach@networkoptix.com',
                    path: 'users/329a88b1-df06-2871-5cde-15a50be17743',
                    svgIcon: '',
                    icon: 'glyphicon-cloud',
                },
                {
                    additionalLabel: 'Administrator',
                    id: '992b3a08-8823-aa10-fef0-5c6abe8b58fc',
                    disabled: false,
                    label: 'iartemchuk@networkoptix.com',
                    path: 'users/992b3a08-8823-aa10-fef0-5c6abe8b58fc',
                    svgIcon: '',
                    icon: 'glyphicon-cloud',
                },
                {
                    additionalLabel: 'Administrator',
                    id: '1ba9a833-0885-9649-8f1f-8400edf48868',
                    disabled: false,
                    label: 'nhartleb@networkoptix.com',
                    path: 'users/1ba9a833-0885-9649-8f1f-8400edf48868',
                    svgIcon: '',
                    icon: 'glyphicon-cloud',
                },
                {
                    additionalLabel: 'Administrator',
                    id: 'f6209ae5-2047-a99a-b4e8-a0e2d76ef25c',
                    disabled: false,
                    label: 'rbarsegian@networkoptix.com',
                    path: 'users/f6209ae5-2047-a99a-b4e8-a0e2d76ef25c',
                    svgIcon: '',
                    icon: 'glyphicon-cloud',
                },
                {
                    additionalLabel: 'Owner',
                    id: 'ab4a824b-3f71-324a-652e-62b71c3265c1',
                    disabled: false,
                    label: 'ttsolov@networkoptix.com',
                    path: 'users/ab4a824b-3f71-324a-652e-62b71c3265c1',
                    svgIcon: '',
                    icon: 'glyphicon-cloud',
                },
            ],
            toggle: false,
        },
        {
            id: 'servers',
            svg: 'servers',
            label: 'Servers',
            path: 'servers/a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393',
            level3: [
                {
                    id: '{a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393}',
                    svgIcon: '',
                    label: 'Server Sofia',
                    path: 'servers/a29fc3f4-0de6-0ed6-be0a-a55bc0ea5393',
                    additionalLabel: '192.168.5.5',
                    indent: true,
                    disabled: false,
                },
            ],
            toggle: false,
        },
    ];

    let menuService: NxMenuService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [NxMenuService],
        });
        menuService = TestBed.inject(NxMenuService);
        menuService.content$$.set(menuContent);
    }));

    it('should create the service', () => {
        expect(menuService).toBeTruthy();
    });

    it('should have content set', () => {
        expect(menuService.content$$()).toEqual(menuContent);
    });

    it('should set navItemId', () => {
        expect(menuService.navItemId$$()).toBe(''); // init value
        menuService.navItemId$$.set('General');
        expect(menuService.navItemId$$()).toBe('General');
    });

    it('should set hoverItemId', () => {
        expect(menuService.hoverItemId$$()).toBe(''); // init value
        menuService.hoverItemId$$.set('General');
        expect(menuService.hoverItemId$$()).toBe('General');
    });

    it('should set section', () => {
        expect(menuService.selectedSection$$()).toBe(''); // init value
        menuService.selectedSection$$.set('General');
        expect(menuService.selectedSection$$()).toBe('General');
    });

    it('should set detail', () => {
        expect(menuService.selectedDetailsSection$$()).toBe(''); // init value
        menuService.selectedDetailsSection$$.set('General');
        expect(menuService.selectedDetailsSection$$()).toBe('General');
    });

    it('should get item by Id', () => {
        expect(menuService.getItemBy('licenses')).toBeTruthy();
        expect(menuService.getItemBy('blah-blah')).toBeUndefined();
    });

    it('should filter items by', inject([NxSearchService], (searchService: NxSearchService) => {
        const menuModel = {
            query: '192.168.5.10',
        };
        searchService.getMatchPatterns(menuModel);
        const filtered = menuService.filterMenu(menuModel);

        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe('cameras');
        expect(filtered[0].level3.length).toBe(1);
        expect(filtered[0].level3[0].additionalLabel).toBe('192.168.5.100');
    }));
});
