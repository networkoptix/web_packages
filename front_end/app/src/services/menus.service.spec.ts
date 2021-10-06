import { waitForAsync, TestBed }     from '@angular/core/testing';
import { TranslateService }          from '@ngx-translate/core';
import { ReplaySubject, Subject }    from 'rxjs';
import { NxMenusService }            from '@services/menus.service';
import { NxConfigService }           from '@services/nx-config';
import { nxConfig }                  from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService }          from './session.service';
import { WINDOW }                    from './window-provider';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { getMockTranslations }       from '@src/_mocks/helpers.test';
import { headerNodes }               from '@src/_mocks/nodesMock';
import { setupTestSystem }           from '@src/_mocks/system.test';

describe('Menus service', () => {
    let menu: NxMenusService;

    const translateMock = {
        instant: (text) => text
    };

    const sessionMock = {
        loginStateSubject: new ReplaySubject<string>(0)
    };

    const configMock = {
        getConfig    : () => nxConfig,
        flagsEnabled : () => false
    };
    const langMock = getMockTranslations();

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxMenusService,
                { provide: NxLanguageProviderService, useValue: langMock },
                { provide: NxConfigService, useValue: configMock },
                { provide: TranslateService, useValue: translateMock },
                { provide: NxSessionService, useValue: sessionMock },
                { provide: NxCloudApiService, useValue: {} },
                { provide: WINDOW, useValue: {} }
            ]
        });
        menu = TestBed.inject(NxMenusService);
        menu['CONFIG'] = configMock.getConfig();
        menu['LANG'] = langMock.translations;
    }));

    it('should create the service', () => {
        expect(menu).toBeTruthy();
    });

    it('should update menu on language change', () => {
        langMock.translateSubject.next(langMock.translations);
        const stricture = menu['menusStructure'];
        expect(stricture).toBeDefined();
        expect(stricture.authorizeFooter.title).toBe('Demo');
        expect(stricture.authorizeFooter.description).toBe('demo');
        expect(stricture.authorizeFooter.nodes.length).toBe(3);
    });

    it('should get header menu', () => {
        langMock.translateSubject.next(langMock.translations);
        menu['menusStructure'].header = {
            title       : '',
            description : '',
            nodes       : headerNodes
        };
        sessionMock.loginStateSubject.next('');
        menu.getMenu('header', false).subscribe((filtered) => {
            expect(filtered).toBeDefined();
            expect(filtered.nodes.length).toBe(1);

            const node = filtered.nodes[0];
            expect(node.name).toBe('Services');
            expect(node.breadcrumbs.length).toBe(0);
            expect(node.nodes.length).toBe(3);

            expect(node.nodes[0].name).toBe('Downloads');
            expect(node.nodes[0].breadcrumbs.length).toBe(1);
            expect(node.nodes[0].breadcrumbs[0].name).toBe('Services');
            expect(node.nodes[0].nodes.length).toBe(0);
            // rest of the nodes follow same logic
        });
    });

    it('should set active system menu', () => {
        const systemMock = setupTestSystem();
        menu.updateActiveSystemMenu(systemMock);

        menu.currentSystemNode$.subscribe((activeSystemNode) => {
            expect(activeSystemNode.name).toBe(systemMock.info.name);
            expect(activeSystemNode.url).toBe(`/systems/${systemMock.id}`);
            expect(activeSystemNode.nodes.length).toBe(2);
            expect(activeSystemNode.nodes[0].name).toBe('View');
            expect(activeSystemNode.nodes[0].url).toBe(`/systems/${systemMock.id}/view`);
            expect(activeSystemNode.nodes[1].name).toBe('Settings');
            expect(activeSystemNode.nodes[1].url).toBe(`/systems/${systemMock.id}`);
        });
    });
});
