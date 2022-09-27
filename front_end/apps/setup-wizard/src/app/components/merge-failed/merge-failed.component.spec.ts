import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MergeFailedComponent } from './merge-failed.component';

describe('MergeFailedComponent', () => {
    let component: MergeFailedComponent;
    let fixture: ComponentFixture<MergeFailedComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [MergeFailedComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(MergeFailedComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
