import { CommonModule } from '@angular/common';
import { DebugElement, ElementRef } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterLink } from '@angular/router';
import { MockDirective } from 'ng-mocks';

import { HelperMockProvider } from '@mocks/helpers.test';
import {
    routeLandingMock,
    getStartedNode
} from '@mocks/knowledge_base_landing.mock';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { NxGetStartedComponent } from './get-started.component';

interface StepContent {
    title: string;
    imageSrc: string;
}

describe('NxGetStartedComponent', () => {
    const stepToTest = 1;
    const step = getStartedNode.nodes[stepToTest - 1];
    const [stepIcon, stepAnimatedIcon] = step.icon.split(' ');
    let component: NxGetStartedComponent;
    let fixture: ComponentFixture<NxGetStartedComponent>;
    let el: DebugElement;
    let stepContent: StepContent;

    const configMock = { config: nxConfig };

    const getFirstStepContent = (el: ElementRef<HTMLElement>): StepContent => {
        const detailBlock = el.nativeElement.querySelector('.detail-block');
        const stepText = detailBlock.querySelector('.step-text');
        const title = stepText.querySelector('h3').innerText;
        const imageSrc = '/static' +
            detailBlock.querySelector<HTMLImageElement>('.step-image > img')
                .src
                .split('static')[1];

        return { title, imageSrc };
    };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    NxGetStartedComponent,
                    MockDirective(RouterLink),
                ],
                imports: [CommonModule],
                providers: [
                    new HelperMockProvider(Router, routeLandingMock),
                    new HelperMockProvider(NxConfigService, configMock),
                    new HelperMockProvider(WINDOW, {})
                ]
            });

            fixture = TestBed.createComponent(NxGetStartedComponent);
            component = fixture.componentInstance;
            component.getStartedNode = getStartedNode;
            component.ngOnChanges({
                getStartedNode: {
                    currentValue: getStartedNode,
                    previousValue: null,
                    firstChange: false,
                    isFirstChange: () => true
                }
            });
            el = fixture.debugElement;
            fixture.detectChanges();
            stepContent = getFirstStepContent(el);
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', () => {
        const heading = el.nativeElement.querySelector('h2').innerText;

        expect(heading).toBe(getStartedNode.title);
    });

    it('should show the correct number of detail blocks', () => {
        const numStepBlocks =
            el.nativeElement.querySelectorAll('.detail-block').length;
        const numStepNodes = getStartedNode.nodes.length;

        expect(numStepBlocks).toBe(numStepNodes);
    });

    it('should show the correct step title', () => {
        expect(stepContent.title).toBe(step.title);
    });

    it('should show the correct step image', () => {
        const stepIconSrc = `${configMock.config.images.dirDevelopers}${stepIcon}`;
        expect(stepContent.imageSrc).toBe(stepIconSrc);
    });

    it('should show the correct animated step image state', async () => {
        const stepIconSrc = `${configMock.config.images.dirDevelopers}${stepIcon}`;
        const stepIconAnimatedSrc = `${configMock.config.images.dirDevelopers}${stepAnimatedIcon}`;
        const detailBlock = el.nativeElement.querySelector('.detail-block');
        detailBlock.dispatchEvent(new MouseEvent('mouseenter'));
        await fixture.whenStable();
        fixture.detectChanges();
        expect(getFirstStepContent(el).imageSrc).toBe(stepIconAnimatedSrc);
        detailBlock.dispatchEvent(new MouseEvent('mouseleave'));
        await fixture.whenStable();
        fixture.detectChanges();
        expect(getFirstStepContent(el).imageSrc).toBe(stepIconSrc);
    });
});
