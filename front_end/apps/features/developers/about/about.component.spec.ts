import { CommonModule } from '@angular/common';
import { Input, Component } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { getMockTranslations, HelperMockProvider } from '@mocks/helpers.test';
import {
    landingRoute,
    docMenuMap,
    menuStructure,
    documentation,
    introNode,
    routeLandingMock
} from '@mocks/knowledge_base_landing.mock';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';

import { NxAboutComponent } from './about.component';

@Component({
    selector: 'nx-footer',
    template: '<div></div>'
})
class MockFooterComponent {
    @Input() center;
}

describe('NxAboutComponent', () => {
    let component: NxAboutComponent;
    let fixture: ComponentFixture<NxAboutComponent>;
    // let el: DebugElement;

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
                    TranslateModule.forRoot(),
                    RouterTestingModule
                ],
                providers: [
                    new HelperMockProvider(NxCloudApiService, cloudApiMock),
                    NxHeaderService,
                    new HelperMockProvider(ActivatedRoute, landingRoute),
                    new HelperMockProvider(Router, routeLandingMock),
                    new HelperMockProvider(NxRibbonService, ribbonMock),
                    new HelperMockProvider(NxLanguageProviderService, translateMock),
                    new HelperMockProvider(NxMenusService, mockMenu),
                    NxPageService,
                    new HelperMockProvider(NxAccountService, accountMock),
                    new HelperMockProvider(NxConfigService, configMock)
                ].map(HelperMockProvider.mapServices)
            });

            fixture = TestBed.createComponent(NxAboutComponent);
            fixture.componentInstance.aboutStructure$.next([]);
            component = fixture.componentInstance;
            // el = fixture.debugElement;
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
