import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement, Input, Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { NxAboutComponent } from './about.component';
import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxRibbonService } from '@components/ribbon';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxHeaderService } from '@services/nx-header.service';
import { NxPageService } from '@services/page.service';
import {
    landingRoute,
    docMenuMap,
    menuStructure,
    documentation,
    introNode,
    routeLandingMock
} from '../../../_mocks/knowledge_base_landing.mock';
import { getMockTranslations, MockProvider, TranslateTestingModule } from '../../../_mocks/helpers.test';
import { RouterTestingModule } from '@angular/router/testing';

@Component({
    selector : 'nx-footer',
    template : '<div></div>'
})
class MockFooterComponent {
    @Input() center;
}

describe('NxAboutComponent', () => {
    let component: NxAboutComponent;
    let fixture: ComponentFixture<NxAboutComponent>;
    let el: DebugElement;
    const translateMock = getMockTranslations();
    const configMock = { config: { ...nxConfig, docMenuMap } };

    const account = { is_superuser: false };
    const accountMock = {
        get: () => Promise.resolve(account),
        accountSubject: new BehaviorSubject(account)
    };
    const ribbonMock: any = {
        hide() {
            this.isShown = false;
        },
        isShown: true
    };
    const aboutParentStructure = {
        ...menuStructure,
        nodes: [introNode]
    };
    const mockMenu = {
        getMenu: () => new BehaviorSubject(aboutParentStructure)
    };

    const cloudApiMock = {
        getDocumentation: () => new BehaviorSubject(documentation)
    };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    NxAboutComponent,
                    MockFooterComponent
                ],
                imports: [
                    CommonModule,
                    FormsModule,
                    TranslateTestingModule,
                    RouterTestingModule
                ],
                providers: [
                    new MockProvider(NxCloudApiService, cloudApiMock),
                    NxHeaderService,
                    new MockProvider(ActivatedRoute, landingRoute),
                    new MockProvider(Router, routeLandingMock),
                    new MockProvider(NxRibbonService, ribbonMock),
                    new MockProvider(NxLanguageProviderService, translateMock),
                    new MockProvider(NxMenusService, mockMenu),
                    NxPageService,
                    new MockProvider(NxAccountService, accountMock),
                    new MockProvider(NxConfigService, configMock)
                ].map(MockProvider.mapServices)
            });

            fixture = TestBed.createComponent(NxAboutComponent);
            fixture.componentInstance.aboutStructure$.next([]);
            component = fixture.componentInstance;
            el = fixture.debugElement;
            fixture.detectChanges();
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should set the correct page title and description', () => {
        const { pageTitle, pageDescription } = (component as any).pageService;
        const { title, description } = aboutParentStructure;
        expect(pageTitle).toEqual(title);
        expect(pageDescription).toEqual(description);
    });

    it('should hide ribbon for non superuser', () => {
        expect((component as any).ribbonService.isShown).not.toBeTruthy();
    });
});
