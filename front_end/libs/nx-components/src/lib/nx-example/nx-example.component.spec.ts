import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NxExampleComponent } from './nx-example.component';

describe('NxComponentsComponent', () => {
    let component: NxExampleComponent;
    let fixture: ComponentFixture<NxExampleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NxExampleComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(NxExampleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
