import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

import { NxConfigService } from '@services/nx-config';
import { nxConfig } from '@services/nx-config/config';
import { NxSupportComponent } from './support.component';
import { WINDOW } from '@services/window-provider';
import {
    getMockTranslations,
    MockProvider,
    sanitizerMock
} from '@src/_mocks/helpers.test';
import { supportNode } from '@src/_mocks/knowledge_base_landing.mock';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { DirectivesModule } from '@directives/directives.module';
import { RouterLinkDirectiveStub } from '@src/_testing';
import { ErrorStateManager } from '../error-state/error-state-manager';
import { NxErrorStateComponent } from '../error-state/error-state.component';
import { NxAccountService } from '@services/account.service';
import { RouterTestingModule } from "@angular/router/testing";

describe('NxSupportComponent', () => {
    let component: NxSupportComponent;
    let fixture: ComponentFixture<NxSupportComponent>;
    let el: DebugElement;

    const [_, expectedLeftBackground, expectedRightBackground] = supportNode.icon.split(' ');
    const configMock = { config: nxConfig };
    const langMock = getMockTranslations();

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    NxSupportComponent,
                    NxErrorStateComponent,
                    RouterLinkDirectiveStub
                ],
                imports: [
                    CommonModule,
                    DirectivesModule,
                    RouterTestingModule
                ],
                providers: [
                    new MockProvider(NxConfigService, configMock),
                    new MockProvider(NxLanguageProviderService, langMock),
                    new MockProvider(DomSanitizer, sanitizerMock),
                    new MockProvider(WINDOW, window),
                    new MockProvider(NxAccountService, {})
                ]
            });

            fixture = TestBed.createComponent(NxSupportComponent);
            component = fixture.componentInstance;
            component.supportNode = supportNode;
            component.ngOnChanges({
                supportNode: {
                    currentValue: supportNode,
                    previousValue: null,
                    firstChange: true,
                    isFirstChange: () => true
                }
            });
            el = fixture.debugElement;
            fixture.detectChanges();
            component.errorManager = new ErrorStateManager(window);
            fixture.detectChanges();
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', () => {
        const heading = el.nativeElement.querySelector('.support-link').innerText;
        expect(heading).toBe(supportNode.title);
    });

    it('should show the correct body content', () => {
        const body = el.nativeElement.querySelector('.support-body').innerHTML;
        expect(body.trim()).toBe(supportNode.asset.shortDescription.trim());
    });

    it('should show the correct background on left side', () => {
        const leftBackground = el.nativeElement.querySelector('.left-image > svg-icon').dataset.src;
        expect(leftBackground).toBe(configMock.config.icons.dir + expectedLeftBackground);
    });

    it('should show the correct background on right side', () => {
        const rightBackground = el.nativeElement.querySelector('.right-image > svg-icon').dataset.src;
        expect(rightBackground).toBe(configMock.config.icons.dir + expectedRightBackground);
    });
});
