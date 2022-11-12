import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement, ElementRef } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { last } from 'lodash-es';
import { MockDirective } from 'ng-mocks';

import { NxSafePipe } from '@app/pipes/nx-safe';
import { NxMatchHeightDirective } from '@directives/nx-match-height.directive';
import { HelperMockProvider } from '@mocks/helpers.test';
import { capabilitiesNode } from '@mocks/knowledge_base_landing.mock';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { NxCapabilitiesComponent } from './capabilities.component';

interface BlockContent {
    details: string;
    introLine: string;
    headerBackground: string;
    heading: string;
}

// Disable for now until slowdown can be fixed
xdescribe('NxCapabilitiesComponent', () => {
    const capability = capabilitiesNode.nodes[0];
    let component: NxCapabilitiesComponent;
    let fixture: ComponentFixture<NxCapabilitiesComponent>;
    let el: DebugElement;
    let blockContent: BlockContent;

    const configMock = { config: nxConfig };

    const getFirstBlockContent = (el: ElementRef<HTMLElement>): BlockContent => {
        const detailBlock = el.nativeElement.querySelector('.capability-card');
        const header = detailBlock.querySelector('header');
        const introLine = header
            .querySelector<HTMLDivElement>('.intro-line').innerText;
        const heading = header.querySelector('h3').innerText;
        const details = detailBlock
            .querySelector<HTMLDivElement>('.capability-detail').innerText;
        const headerBackground = header.style.backgroundImage;

        return { details, introLine, headerBackground, heading };
    };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    NxCapabilitiesComponent,
                    MockDirective(RouterLink),
                    NxSafePipe,
                    NxMatchHeightDirective
                ],
                imports: [
                    CommonModule,
                    AngularSvgIconModule.forRoot(),
                    HttpClientTestingModule
                ],
                providers: [
                    new HelperMockProvider(NxConfigService, configMock),
                    new HelperMockProvider(WINDOW, {})
                ]
            });

            fixture = TestBed.createComponent(NxCapabilitiesComponent);
            component = fixture.componentInstance;
            capabilitiesNode.url = 'testUrl';
            component.capabilitiesNode = capabilitiesNode;
            el = fixture.debugElement;
            fixture.detectChanges();
            blockContent = getFirstBlockContent(el);
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should display the correct heading', () => {
        const headingText = el.nativeElement.querySelector('.heading-link').innerText;
        expect(headingText).toBe(capabilitiesNode.title);
    });

    it('should display the correct number of blocks', () => {
        const detailBlockCount = el.nativeElement.querySelectorAll('.capability-card').length;
        expect(detailBlockCount).toBe(capabilitiesNode.nodes.length);
    });

    it('should display the correct block heading background', () => {
        const backgroundImage = last(capability.icon.split(' '));
        const backgroundImageUrl = `url("${configMock.icons.backgrounds}${backgroundImage}")`;
        expect(blockContent.headerBackground).toContain(backgroundImageUrl);
    });

    it('should display the the correct block details from asset', () => {
        expect(blockContent.details).toBe(capability.asset.shortDescription);
    });

    it('should display the correct block intro line from node', () => {
        expect(blockContent.introLine).toBe(capability.subtitle);
        expect(blockContent.heading).toBe(capability.title);
    });

    it('should display the correct block heading from node', () => {
        expect(blockContent.heading).toBe(capability.title);
    });
});
