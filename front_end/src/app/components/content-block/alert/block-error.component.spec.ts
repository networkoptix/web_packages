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
            type="error"
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

describe('NxAlertBlockComponent (error)', () => {
    let wrapperComponent: TestHostComponent;
    let fixture: ComponentFixture<TestHostComponent>;
    let el: HTMLDivElement;

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
        const card = el.querySelector<HTMLDivElement>('.card');
        expect(card.className).toContain('simple-error');
    });

    // the rest is same as default card
});
