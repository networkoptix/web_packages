import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NxIconComponent } from './nx-icon.component';

describe('NxIconComponent', () => {
    let component: NxIconComponent;
    let fixture: ComponentFixture<NxIconComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NxIconComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(NxIconComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('Icon color mapping', () => {
    it('should have all icon colors mapped', async () => {
        const missingColor = await NxIconComponent.ensureStyleMapping();
        expect(missingColor).toEqual([]);
    });
});
