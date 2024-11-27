import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EventEmitter } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { identity } from 'lodash-es';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';

import { headerNodes } from '@mocks/nodesMock';
import { setupTest41System } from '@mocks/system.test';

import { NxMenusService } from './menus.service';
import { nxConfig } from './nx-config/config';

const setupMenu = async (): Promise<NxMenusService> => {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(),
            provideHttpClientTesting(),
            MockProvider(Store, { select: () => of('') }),
            MockProvider(TranslateService, {
                instant: identity,
                onTranslationChange: new EventEmitter(),
            }),
        ],
    });
    nxConfig.dynamicMenus = {
        header: {
            title: '',
            description: '',
            nodes: headerNodes,
        },
    };
    return TestBed.inject(NxMenusService);
};

describe('Menus service', () => {
    it('should create the service', async () => {
        const menu = await setupMenu();
        expect(menu).toBeTruthy();
    });

    it('should get header menu', async () => {
        const menu = await setupMenu();
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

    it('should set active system menu', async () => {
        const menu = await setupMenu();
        const systemMock = setupTest41System();
        // @ts-expect-error We only need it to fire
        systemMock.infoSubject = of('');
        systemMock.canViewADevice = () => true;
        systemMock.canViewBookmarks = () => false;
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
