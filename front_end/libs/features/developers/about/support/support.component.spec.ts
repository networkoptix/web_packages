import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed
} from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MockDirective } from 'ng-mocks';

import {
    getMockTranslations,
    HelperMockProvider,
    sanitizerMock
} from '@app/_mocks/helpers.test';
import { supportNode } from '@app/_mocks/knowledge_base_landing.mock';
import { DirectivesModule } from '@directives/directives.module';
import { NxAccountService } from '@services/account.service';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { ErrorStateManager } from '../error-state/error-state-manager';
import { NxErrorStateComponent } from '../error-state/error-state.component';

import { NxSupportComponent } from './support.component';

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
                    MockDirective(RouterLink),
                ],
                imports: [
                    CommonModule,
                    DirectivesModule,
                    RouterTestingModule
                ],
                providers: [
                    new HelperMockProvider(NxConfigService, configMock),
                    new HelperMockProvider(NxLanguageProviderService, langMock),
                    new HelperMockProvider(DomSanitizer, sanitizerMock),
                    new HelperMockProvider(WINDOW, window),
                    new HelperMockProvider(NxAccountService, {})
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
        expect(leftBackground).toBe(configMock.config.images.dirDevelopers + expectedLeftBackground);
    });

    it('should show the correct background on right side', () => {
        const rightBackground = el.nativeElement.querySelector('.right-image > svg-icon').dataset.src;
        expect(rightBackground).toBe(configMock.config.images.dirDevelopers + expectedRightBackground);
    });
});
