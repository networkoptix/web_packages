import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MergeProcessComponent } from './merge-process.component';

describe('MergeProcessComponent', () => {
    let component: MergeProcessComponent;
    let fixture: ComponentFixture<MergeProcessComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [MergeProcessComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(MergeProcessComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
