import { Component } from '@angular/core';

import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { setupComponent } from '@components/src/setup';

@Component({
    standalone: true,
    imports: [NxAlertBlockComponent],
    template: `
        <nx-alert-block
            class="d-block mt-3"
            type="error"
            [iconSrc]="'error.svg'"
            [line1]="'Settings displayed below are advanced.'"
            [line2]="'Changing them may cause server to work incorrectly.'"
            [btnIconSrc]="'eye_closed.svg'"
            [btnCaption]="'Hide Advanced Settings'"
        >
        </nx-alert-block>
    `,
})
class TestHostComponent {}

const setupAlertBlockComponent = (): ReturnType<typeof setupComponent<TestHostComponent>> =>
    setupComponent(TestHostComponent);

describe('NxAlertBlockComponent (error)', () => {
    it('should create', async () => {
        const { component } = await setupAlertBlockComponent();
        expect(component).toBeTruthy();
    });

    it('should have card wrapper', async () => {
        const { debugElement } = await setupAlertBlockComponent();
        const card = debugElement.nativeElement.querySelector('.card');
        expect(card.className).toContain('simple-error');
    });

    // the rest is same as default card
});
