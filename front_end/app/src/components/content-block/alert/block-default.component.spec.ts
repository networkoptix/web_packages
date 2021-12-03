import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';

import {
    NxAlertBlockComponent
} from '@components/content-block/alert/block.component';
import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';

@Component({
    template: `
        <nx-alert-block
            class="d-block mt-3"
            [iconSrc]="'error.svg'"
            [line1]="'Settings displayed below are advanced.'"
            [line2]="'Changing them may cause server to work incorrectly.'"
            [btnIconSrc]="'eye_closed.svg'"
            [btnCaption]="'Hide Advanced Settings'">
        </nx-alert-block>
    `
})
class TestHostComponent {
}

describe('NxAlertBlockComponent (default)', () => {
    let wrapperComponent: TestHostComponent;
    let fixture: ComponentFixture<TestHostComponent>;
    let el;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                AngularSvgIconModule.forRoot(),
                HttpClientTestingModule
            ],
            declarations: [
                NxAlertBlockComponent,
                TestHostComponent,
                NxContentBlockSectionComponent
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(TestHostComponent);
        wrapperComponent = fixture.componentInstance;
        el = fixture.debugElement.nativeElement;

        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(wrapperComponent).toBeDefined();
    });

    it('should have card wrapper', () => {
        const card = el.querySelector('.card');
        expect(card.className).toContain('simple-default');
    });

    it('should not have card header', () => {
        const header = el.querySelector('.card nx-section .card--header');
        expect(header).toBeFalsy();
    });

    it('should not have card footer', () => {
        const footer = el.querySelector('.card nx-section .card--footer');
        expect(footer).toBeFalsy();
    });

    it('should have card body', () => {
        const body = el.querySelector('.card nx-section .card--body');
        expect(body.className).toContain('section clearfix');
    });

    it('should have card body subheader hidden', () => {
        const body = el.querySelector('.card nx-section .card--body .card--body-subheader');
        expect(body.hidden).toBeTrue();
    });

    describe('with body content', () => {
        let body;
        let bodyElements;
        let leftSection;
        let leftSectionIcon;
        let leftSectionText;
        let rightSection;

        beforeEach(() => {
            body = el.querySelector('.card nx-section .card--body .card--body-content div');
            bodyElements = body.querySelectorAll('div');
            leftSection = bodyElements[0];
            leftSectionIcon = bodyElements[1];
            leftSectionText = bodyElements[2];
            rightSection = bodyElements[3];
        });

        it('should set divs', () => {
            expect(body.className).toContain('d-flex row alert-block m-0 py-2 px-3 justify-content-between');
            expect(bodyElements.length).toBe(4);
        });

        it('should set left section', () => {
            expect(leftSection.className).toContain('d-flex flex-row alert-block-text align-items-center');
        });

        it('should set icon', () => {
            expect(leftSectionIcon.className).toContain('d-flex align-items-start');
            expect(leftSectionIcon.querySelector('svg-icon')).toBeDefined();
        });

        it('should set text', () => {
            expect(leftSectionText.className).toContain('ml-2');
            expect(leftSectionText.innerHTML.replace(/<!--((.|[\r\n|\r|\n])*?)-->/g, '').trim())
                .toBe('<span>Settings displayed below are advanced.</span><br><span>Changing them may cause server to work incorrectly.</span>');
        });

        it('should set right section', () => {
            expect(rightSection.className).toContain('d-flex alert-block-button align-items-start');

            const rightSectionButton = rightSection.querySelector('button');
            expect(rightSectionButton.querySelector('svg-icon')).toBeDefined();
            expect(rightSectionButton.querySelector('span').className).toBe('ml-1');
            expect(rightSectionButton.querySelector('span').innerHTML).toBe('Hide Advanced Settings');
        });
    });
});
