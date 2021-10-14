import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NxLeftMenuComponent } from './left-menu.component';
import { MockProvider } from '../../_mocks/helpers.test';
import { NxConfigService } from '@services/nx-config';
import { CommonModule, Location } from '@angular/common';
import { NxKnowledgebaseService } from '@pages/developers/knowledge-base/knowledge-base.service';
import { BehaviorSubject } from 'rxjs';
import { WINDOW } from '@services/window-provider';
import { kbMenu } from '../../_mocks/knowledge_base_menu.mock';
import { docMenuMap } from '../../_mocks/knowledge_base_landing.mock';
import { nxConfig } from '@services/nx-config/config';
import { DirectivesModule } from '@directives/directives.module';
import { DebugElement } from '@angular/core';
import { RouterLinkDirectiveStub } from '@src/_testing';

import { AngularSvgIconModule } from 'angular-svg-icon';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('NxLeftMenuComponent', () => {
    let component: NxLeftMenuComponent;
    let fixture: ComponentFixture<NxLeftMenuComponent>;
    let el: DebugElement;

    const initialNode = kbMenu.nodes[0];

    const windowMock = {
        location: {
            search: ''
        }
    };
    const kbMock = {
        menuSubject          : new BehaviorSubject(kbMenu),
        activeAssetIdSubject : new BehaviorSubject(initialNode.asset_id)
    };
    const configMock = {
        config: {
            ...nxConfig,
            docMenuMap
        }
    };
    const locationMock = {
        _path        : initialNode.url,
        path         : () => locationMock._path,
        replaceState : (newUrl) => {
            const [url, search = ''] = newUrl.split('?');
            windowMock.location.search = search;
            locationMock._path = url;
        }
    };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                imports: [
                    CommonModule,
                    DirectivesModule,
                    AngularSvgIconModule,
                    HttpClientTestingModule,
                    RouterTestingModule
                ],
                declarations : [
                    NxLeftMenuComponent,
                    RouterLinkDirectiveStub
                ],
                providers    : [
                    new MockProvider(NxConfigService, configMock),
                    new MockProvider(Location, locationMock),
                    new MockProvider(NxKnowledgebaseService, kbMock),
                    new MockProvider(WINDOW, windowMock)
                ]
            }).compileComponents();

            fixture = TestBed.createComponent(NxLeftMenuComponent);
            component = fixture.componentInstance;
            el = fixture.debugElement;
            fixture.whenStable();
            fixture.detectChanges();
        })
    );

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should highlight the correct initial activated node', () => {
        const activeNode = el.nativeElement.querySelector('.activated-highlight');
        const activeNodeName = activeNode.innerText;
        expect(activeNodeName).toBe(initialNode.name);
    });

    it('should show the correct open nodes', () => {
        const openNodes = component.openNodes;
        expect(openNodes.length).toBe(1);
        expect(openNodes[0]).toBe(initialNode.name);
    });

    it('should correctly open node', () => {
        const openNodes = component.openNodes;
        const nodeToOpen = el.nativeElement.querySelector('.menu-link:not(.activated-highlight)');
        const nodeToOpenName = nodeToOpen.innerText;
        nodeToOpen.dispatchEvent(new MouseEvent('click'));
        expect(openNodes.length).toBe(2);
        expect(openNodes[1]).toBe(nodeToOpenName);
        component.openNodes = [initialNode.name];
    });

    it('should correctly close node', () => {
        const nodeToClose = el.nativeElement.querySelector('.menu-link:not(.activated-highlight)');
        const nodeToCloseName = nodeToClose.innerText;
        const stayOpen = kbMenu.nodes[2].name;
        component.openNodes = [initialNode.name, stayOpen, nodeToCloseName];
        nodeToClose.dispatchEvent(new MouseEvent('click'));
        expect(component.openNodes.length).toBe(2);
        expect(component.openNodes).toEqual([initialNode.name, stayOpen]);
    });

    it('should correctly open multiple nodes', () => {
        const openNodes = component.openNodes;
        const [firstNode, secondNode] = el.nativeElement.querySelectorAll('.menu-link:not(.activated-highlight)');
        const firstNodeName = firstNode.innerText;
        const secondNodeName = secondNode.innerText;
        firstNode.dispatchEvent(new MouseEvent('click'));
        secondNode.dispatchEvent(new MouseEvent('click'));
        expect(openNodes.length).toBe(3);
        expect(openNodes).toEqual([initialNode.name, firstNodeName, secondNodeName]);
        component.openNodes = [initialNode.name];
    });
});
