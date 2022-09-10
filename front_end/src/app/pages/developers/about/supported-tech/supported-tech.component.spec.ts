import { CommonModule } from '@angular/common';
import { DebugElement } from '@angular/core';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterLink } from '@angular/router';
import { MockDirective } from 'ng-mocks';

import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

import { HelperMockProvider } from '../../../../_mocks/helpers.test';
import {
    routeLandingMock,
    supportedTechNode
} from '../../../../_mocks/knowledge_base_landing.mock';

import { NxSupportedTechComponent } from './supported-tech.component';

describe('For Developers Landing - Supported Tech Node', () => {
    let component: NxSupportedTechComponent;
    let fixture: ComponentFixture<NxSupportedTechComponent>;
    let el: DebugElement;

    const configMock = { config: nxConfig };

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                declarations: [
                    NxSupportedTechComponent,
                    MockDirective(RouterLink),
                ],
                imports: [CommonModule],
                providers: [
                    new HelperMockProvider(Router, routeLandingMock),
                    new HelperMockProvider(NxConfigService, configMock),
                    new HelperMockProvider(WINDOW, {})
                ]
            });

            fixture = TestBed.createComponent(NxSupportedTechComponent);
            component = fixture.componentInstance;
            component.supportedTechNode = supportedTechNode;
            el = fixture.debugElement;
            fixture.detectChanges();
        })
    );

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should show the correct heading', () => {
        const heading = el.nativeElement.querySelector('h2').innerText;

        expect(heading).toBe(supportedTechNode.title);
    });

    it('should show the correct number of tech blocks', () => {
        const numTechBlocks =
            el.nativeElement.querySelectorAll('.tech-block').length;
        const numIconLinks = supportedTechNode.nodes.find(
            ({ title }) => title === 'Icon Links'
        ).nodes.length;

        expect(numTechBlocks).toBe(numIconLinks);
    });

    it('should show the correct number of language blocks', () => {
        const numLangBlocks =
            el.nativeElement.querySelectorAll('.language-block').length;
        const textLinks = supportedTechNode.nodes.find(
            ({ title }) => title === 'Text Links'
        ).nodes.length;

        expect(numLangBlocks).toBe(textLinks);
    });

    it('should show the language and tech sections in the correct order', () => {
        const sections = [
            ...el.nativeElement.querySelectorAll('.supported-tech > div')
        ].map(el => el.className);
        const expectedSections = supportedTechNode.nodes.map(({ title }) =>
            title === 'Icon Links'
                ? 'tech-wrapper'
                : title === 'Text Links'
                    ? 'language-wrapper'
                    : ''
        );

        expect(sections).toEqual(expectedSections);
    });

    it('should show the correct tech tooltip', () => {
        const tooltip = el.nativeElement.querySelector('.tech-block').title;
        const techNode = supportedTechNode.nodes.find(
            ({ title }) => title === 'Icon Links'
        ).nodes[0];

        expect(tooltip).toBe(techNode.title);
    });

    it('should show the correct language text and tooltip', () => {
        const block = el.nativeElement.querySelector('.language-block');
        const langNode = supportedTechNode.nodes.find(
            ({ title }) => title === 'Text Links'
        ).nodes[0];

        expect(block.innerText).toBe(langNode.title);
        expect(block.title).toBe(langNode.title);
    });
});
