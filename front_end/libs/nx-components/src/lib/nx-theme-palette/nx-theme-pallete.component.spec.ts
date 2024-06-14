import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NxThemePalette } from './nx-theme-palette.component';

describe('NxComponentsComponent', () => {
    let component: NxThemePalette;
    let fixture: ComponentFixture<NxThemePalette>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NxThemePalette],
        }).compileComponents();

        fixture = TestBed.createComponent(NxThemePalette);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
