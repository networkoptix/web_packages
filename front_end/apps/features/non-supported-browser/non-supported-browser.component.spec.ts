import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NonSupportedBrowserComponent } from './non-supported-browser.component';

describe('NonSupportedBrowserComponent', () => {
    let component: NonSupportedBrowserComponent;
    let fixture: ComponentFixture<NonSupportedBrowserComponent>;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [NonSupportedBrowserComponent],
                providers: []
            })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(NonSupportedBrowserComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create NonSupportedBrowserComponent', () => {
        fixture = TestBed.createComponent(NonSupportedBrowserComponent);
        component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });
});
