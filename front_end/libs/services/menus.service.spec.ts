import { HttpClientTestingModule } from '@angular/common/http/testing';
import { waitForAsync, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ReplaySubject } from 'rxjs';

import { getMockTranslations } from '@app/_mocks/helpers.test';
import { headerNodes } from '@app/_mocks/nodesMock';
import { setupTest41System } from '@app/_mocks/system.test';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxSessionService } from './session.service';
import { WINDOW } from './window-provider';

describe('Menus service', () => {
    let menu: NxMenusService;

    const translateMock = {
        instant: text => text
    };

    const sessionMock = {
        loginStateSubject: new ReplaySubject<string>(0)
    };

    const configMock = {
        getConfig: () => nxConfig,
        flagsEnabled: () => false
    };
    const langMock = getMockTranslations();

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
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

    it('should get header menu', () => {
        langMock.translateSubject.next(langMock.translations);
        menu['menusStructure'].header = {
            title: '',
            description: '',
            nodes: headerNodes
        };
        sessionMock.loginStateSubject.next('');
        menu.getMenu('header', false).subscribe(filtered => {
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
        const systemMock = setupTest41System();
        menu.updateActiveSystemMenu(systemMock);

        menu.currentSystemNode$.subscribe(activeSystemNode => {
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
