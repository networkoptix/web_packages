import { SimpleChange } from '@angular/core';
import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';

import { NxCheckboxComponent } from './checkbox.component';

describe('NxCheckboxComponent', () => {
    let component: NxCheckboxComponent;
    let fixture: ComponentFixture<NxCheckboxComponent>;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                declarations: [NxCheckboxComponent],
                providers: []
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxCheckboxComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create NxCheckboxComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should handle @Input(labelText)', () => {
        expect(component.labelText).toBeUndefined();
    });

    it('should have defined states', () => {
        expect(component['cbxStates']).toEqual({
            false: 'unchecked',
            true: 'checked',
            // undefined: 'tristate'
        });
    });

    describe('should set state on @Input(change) change', () => {
        it('to false', () => {
            component.ngOnChanges({
                checked: new SimpleChange(undefined, false, true)
            });
            fixture.detectChanges();
            component.value = false;
            expect(component.state).toBe(component['cbxStates'].false);
        });

        it('to true', () => {
            component.ngOnChanges({
                checked: new SimpleChange(undefined, true, false)
            });
            fixture.detectChanges();
            expect(component.value).toBeTrue();
            expect(component.state).toBe(component['cbxStates'].true);
        });

        it('on toggle', () => {
            let emitValue: boolean;

            component.value = true;
            component.onClick.subscribe((value: boolean) => {
                emitValue = value;
            });

            component.changeState(null);
            fixture.detectChanges();
            expect(emitValue).toBeFalse();
            expect(component.value).toBeFalse();
            expect(component.state).toBe(component['cbxStates'].false);
        });
    });
});
