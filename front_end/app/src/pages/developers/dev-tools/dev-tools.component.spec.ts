import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';

import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxDevToolsComponent } from './dev-tools.component';
import { WINDOW } from '@services/window-provider';
import {
    devToolsNode,
    docMenuMap
} from '../../../_mocks/knowledge_base_landing.mock';
import { MockProvider } from '../../../_mocks/helpers.test';
import { ActivatedRoute } from '@angular/router';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxHeaderService } from '@services/nx-header.service';
import { NxAccountService } from '@services/account.service';
import { RouterLinkDirectiveStub } from '@src/_testing';
import { NxMatchHeightDirective } from '@directives/nx-match-height.directive';

describe('NxDevToolsComponent', () => {
    let component: NxDevToolsComponent;
    let fixture: ComponentFixture<NxDevToolsComponent>;
    let el: DebugElement;

    const configMock = { config: { ...nxConfig, docMenuMap } };
    const mockRoute = {
        snapshot: {
            paramMap: {
                get: () => 'developers'
            }
        }
    };
    const cloudApiMock = {
        getDocumentation: () => of(devToolsNode)
    };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    NxDevToolsComponent,
                    NxMatchHeightDirective,
                    RouterLinkDirectiveStub
                ],
                imports: [
                    CommonModule,
                    AngularSvgIconModule.forRoot(),
                    HttpClientTestingModule
                ],
                providers: [
                    new MockProvider(NxConfigService, configMock),
                    new MockProvider(NxCloudApiService, cloudApiMock),
                    new MockProvider(NxHeaderService, {}),
                    new MockProvider(NxAccountService, {}),
                    new MockProvider(ActivatedRoute, mockRoute),
                    new MockProvider(WINDOW, {})
                ]
            }).compileComponents()
                .then(() => {
                    fixture = TestBed.createComponent(NxDevToolsComponent);
                    component = fixture.componentInstance;
                    el = fixture.debugElement;
                    fixture.detectChanges();
                });
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', () => {
        devToolsNode.url = 'testUrl';
        component.devToolsNode = devToolsNode;
        component.title = devToolsNode.title;
        fixture.detectChanges();
        const heading = el.nativeElement.querySelector('.heading-link').innerText;
        expect(heading).toBe(devToolsNode.title);
    });

    it('should show the correct number of tool blocks', () => {
        const numToolBlocks = el.nativeElement.querySelectorAll('.tool-card').length;
        expect(numToolBlocks).toBe(devToolsNode.nodes.length);
    });

    it('should show the correct tool block heading', () => {
        component.devToolsNode = devToolsNode;
        fixture.detectChanges();
        const toolBlockHeading = el.nativeElement.querySelector('.tool-detail > h3').innerText;

        expect(toolBlockHeading).toBe(devToolsNode.nodes[0].title);
    });

    it('should show the correct tool block content', () => {
        const toolBlockContent = el.nativeElement.querySelector('.tool-detail > p').innerText;
        expect(toolBlockContent).toBe(devToolsNode.nodes[0].asset.shortDescription);
    });
});
