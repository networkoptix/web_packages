import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CameraPageComponent } from './camera-page.component';

xdescribe('CameraPageComponent', () => {
    let component: CameraPageComponent;
    let fixture: ComponentFixture<CameraPageComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [CameraPageComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CameraPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
