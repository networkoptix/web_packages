import { Component, DebugElement } from '@angular/core';

import { setupComponent } from '@app/components/src/setup';

import { NxAlertBlockComponent } from './block.component';

@Component({
    standalone: true,
    imports: [NxAlertBlockComponent],
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

const setupAlertBlockComponent = (): ReturnType<typeof setupComponent<TestHostComponent>> => setupComponent(TestHostComponent);

const getElementRefs = (debugElement: DebugElement) => {
    const body = debugElement.nativeElement.querySelector('nx-section > div');
    const bodyElements = body.querySelectorAll('div');
    const leftSection = bodyElements[0];
    const leftSectionIcon = bodyElements[1];
    const leftSectionText = bodyElements[2];
    const rightSection = bodyElements[3];
    return {
        body,
        bodyElements,
        leftSection,
        leftSectionIcon,
        leftSectionText,
        rightSection,
    };
};

/**
 * TODO: This component was refactored and test cases need to be updated.
 *
 * These test don't properly test the component. They need to be updated.
 */

describe('NxAlertBlockComponent (default)', () => {
    it('should create', async () => {
        const { component } = await setupAlertBlockComponent();
        expect(component).toBeDefined();
    });

    it('should have card wrapper', async () => {
        const { debugElement } = await setupAlertBlockComponent();
        const card = debugElement.nativeElement.querySelector('.card');
        expect(card).toBeTruthy();
    });

    it('should not have card header', async () => {
        const { debugElement } = await setupAlertBlockComponent();
        const header = debugElement.nativeElement.querySelector('.card nx-section .card--header');
        expect(header).toBeFalsy();
    });

    it('should not have card footer', async () => {
        const { debugElement } = await setupAlertBlockComponent();
        const footer = debugElement.nativeElement.querySelector('.card nx-section .card--footer');
        expect(footer).toBeFalsy();
    });

    it('should have card body', async () => {
        const { debugElement } = await setupAlertBlockComponent();
        const body = debugElement.nativeElement.querySelector('.card nx-section .card--body');
        expect(body).toBeTruthy();
    });

    it('should have card body subheader hidden', async () => {
        const { debugElement } = await setupAlertBlockComponent();
        const body = debugElement.nativeElement.querySelector('.card nx-section .card--body .card--body-subheader');
        expect(body.hidden).toBeTruthy();
    });

    describe('with body content', () => {
        it('should set divs', async () => {
            const { debugElement } = await setupAlertBlockComponent();
            const { bodyElements } = getElementRefs(debugElement);
            expect(bodyElements.length).toBe(8);
        });

        it('should set left section', async () => {
            const { debugElement } = await setupAlertBlockComponent();
            const { leftSection } = getElementRefs(debugElement);
            expect(leftSection).toBeTruthy();
        });

        it('should set icon', async () => {
            const { debugElement } = await setupAlertBlockComponent();
            const { leftSectionIcon } = getElementRefs(debugElement);
            expect(leftSectionIcon.querySelector('svg-icon')).toBeDefined();
        });

        it('should set text', async () => {
            const { debugElement } = await setupAlertBlockComponent();
            const { leftSectionText } = getElementRefs(debugElement);
            expect(leftSectionText).toBeTruthy();
        });

        xit('should set right section', async () => {
            const { debugElement } = await setupAlertBlockComponent();
            const { rightSection } = getElementRefs(debugElement);

            const rightSectionButton = rightSection.querySelector('button');
            expect(rightSectionButton.querySelector('span').className).toBe('ml-1');
            expect(rightSectionButton.querySelector('span').innerHTML).toBe('Hide Advanced Settings');
        });
    });
});
