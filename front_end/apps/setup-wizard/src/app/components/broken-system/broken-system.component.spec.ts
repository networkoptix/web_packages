import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrokenSystemComponent } from './broken-system.component';

describe('BrokenSystemComponent', () => {
    let component: BrokenSystemComponent;
    let fixture: ComponentFixture<BrokenSystemComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [BrokenSystemComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(BrokenSystemComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
