import { Component } from '@angular/core';

import { setupComponent } from '../src/setup';

import { NxContentBlockComponent } from './content-block.component';
import { NxContentBlockSectionComponent } from './section/section.component';

@Component({
    standalone: true,
    imports: [NxContentBlockComponent, NxContentBlockSectionComponent],
    template: `
        <nx-block
            type="mb-3"
            header-style="extended"
        >
            <header>HEADER</header>
            <nx-section>BODY</nx-section>
            <footer>FOOTER</footer>
        </nx-block>
    `,
})
class TestHostComponent {}

const setupBlockComponent = (): ReturnType<typeof setupComponent<TestHostComponent>> =>
    setupComponent(TestHostComponent);

describe('NxContentBlockComponent', () => {
    it('should create', async () => {
        const { component } = await setupBlockComponent();
        expect(component).toBeTruthy();
    });

    it('should have card wrapper', async () => {
        const { debugElement } = await setupBlockComponent();
        const card = debugElement.nativeElement.querySelector('.card');
        expect(card.className).toContain('mb-3 extended-header');
    });

    it('should have card header', async () => {
        const { debugElement } = await setupBlockComponent();
        const header = debugElement.nativeElement.querySelector('.card .card--header');
        expect(header.className).toContain('extended-header');
        expect(header.querySelector('header').innerHTML).toBe('HEADER');
    });

    it('should have card footer', async () => {
        const { debugElement } = await setupBlockComponent();
        const footer = debugElement.nativeElement.querySelector('.card .card--footer');
        expect(footer.querySelector('footer').innerHTML).toBe('FOOTER');
    });

    it('should have card body', async () => {
        const { debugElement } = await setupBlockComponent();
        const body = debugElement.nativeElement.querySelector('.card nx-section .card--body');
        expect(body.className).toContain('section clearfix');
    });

    it('should have card body subheader hidden', async () => {
        const { debugElement } = await setupBlockComponent();
        const body = debugElement.nativeElement.querySelector(
            '.card nx-section .card--body .card--body-subheader',
        );
        expect(body.hidden).toBeTruthy();
    });

    it('should have card body content', async () => {
        const { debugElement } = await setupBlockComponent();
        const body = debugElement.nativeElement.querySelector(
            '.card nx-section .card--body .card--body-content',
        );
        expect(body.innerHTML).toBe('BODY');
    });
});
