import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NxAjsPagePlaceholderComponent } from './page-placeholder.component';

describe('NxPagePlaceholderComponent', () => {
    let component: NxAjsPagePlaceholderComponent;
    let fixture: ComponentFixture<NxAjsPagePlaceholderComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [NxAjsPagePlaceholderComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(NxAjsPagePlaceholderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
