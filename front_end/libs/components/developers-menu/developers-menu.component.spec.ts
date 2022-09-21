import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NgModel } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider, MockComponent, MockDirective, MockModule } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

import { HelperMockProvider } from '@app/_mocks/helpers.test';
import { PipesModule } from '@app/pipes/pipes.module';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxSearchComponent } from '@components/search/search.component';
import { DirectivesModule } from '@directives/directives.module';
import { kbMenu } from '@mocks/knowledge_base_menu.mock';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';

import { NxDevelopersMenuComponent } from './developers-menu.component';

describe('Test NxDevelopersMenuComponent', () => {
    let component: NxDevelopersMenuComponent;
    let fixture: ComponentFixture<NxDevelopersMenuComponent>;
    let el: DebugElement;

    const initialNode = kbMenu.nodes[0];

    const windowMock = {
        location: {
            search: ''
        }
    };

    const mockURIService = {
        queryParams: {
            search: ''
        }
    };

    const mockService = {
        menuSubject: new BehaviorSubject(kbMenu),
        activeAssetIdSubject: new BehaviorSubject(initialNode.asset_id),
        activeNode: initialNode,
        activeAssetState: ''
    };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                imports: [
                    MockModule(CommonModule),
                    DirectivesModule,
                    MockModule(AngularSvgIconModule),
                    RouterTestingModule,
                    PipesModule
                ],
                declarations: [
                    NxDevelopersMenuComponent,
                    MockComponent(NxSearchComponent),
                    MockDirective(NgModel)
                ],
                providers: [
                    MockProvider(NxRibbonService),
                    MockProvider(NxConfigService),
                    new HelperMockProvider(WINDOW, windowMock),
                    new HelperMockProvider(NxUriService, mockURIService)
                ]
            }).compileComponents();

            fixture = TestBed.createComponent(NxDevelopersMenuComponent);
            component = fixture.componentInstance;
            component.service = mockService;
            el = fixture.debugElement;
            fixture.whenStable();
            fixture.detectChanges();
        })
    );

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should set displayedMenuNodes', () => {
        expect(component.displayedMenuNodes.length).toBeTruthy();
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

    it('should filter nodes by the query', () => {
        const parent = component.displayedMenuNodes.find(node => node.nodes.length);
        const child = parent.nodes[0];
        component.filterMenuItems(child.name);
        const openNodes = component.openNodes;
        const displayedNodes = component.displayedMenuNodes;
        expect(openNodes.length).toBe(2);
        expect(openNodes).toEqual([child.name, parent.name]);
        expect(displayedNodes.length).toBe(1);
    });
});
