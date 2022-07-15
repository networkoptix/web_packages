import { Component } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';

import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';

import { NxContentBlockComponent } from './content-block.component';

@Component({
    template: `
        <nx-block type="mb-3" header-style="extended">
            <header>HEADER</header>
            <nx-section>BODY</nx-section>
            <footer>FOOTER</footer>
        </nx-block>
    `
})
class TestHostComponent {
}

describe('NxContentBlockComponent', () => {
    let wrapperComponent: TestHostComponent;
    let fixture: ComponentFixture<TestHostComponent>;
    let el: HTMLDivElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxContentBlockComponent,
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
        const card = el.querySelector<HTMLDivElement>('.card');
        expect(card.className).toContain('mb-3 extended-header');
    });

    it('should have card header', () => {
        const header = el.querySelector<HTMLDivElement>('.card .card--header');
        expect(header.className).toContain('extended-header');
        expect(header.querySelector('header').innerHTML).toBe('HEADER');
    });

    it('should have card footer', () => {
        const footer = el.querySelector<HTMLDivElement>('.card .card--footer');
        expect(footer.querySelector('footer').innerHTML).toBe('FOOTER');
    });

    it('should have card body', () => {
        const body = el.querySelector<HTMLDivElement>(
            '.card nx-section .card--body'
        );
        expect(body.className).toContain('section clearfix');
    });

    it('should have card body subheader hidden', () => {
        const body = el.querySelector<HTMLDivElement>(
            '.card nx-section .card--body .card--body-subheader'
        );
        expect(body.hidden).toBeTrue();
    });

    it('should have card body content', () => {
        const body = el.querySelector<HTMLDivElement>(
            '.card nx-section .card--body .card--body-content'
        );
        expect(body.innerHTML).toBe('BODY');
    });
});
