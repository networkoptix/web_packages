import { CommonModule } from '@angular/common';
import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import {
    NxNumericComponent
} from '@components/numeric-input/numeric.component';

function keyEvent(el: HTMLInputElement, key: string, eventType: string): void {
    const event: KeyboardEvent = new KeyboardEvent(eventType, {
        key: key
    });
    el.dispatchEvent(event);
}

describe('NumericComponent', () => {
    let component: NxNumericComponent;
    let fixture: ComponentFixture<NxNumericComponent>;
    let el: HTMLInputElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                FormsModule
            ],
            declarations: [NxNumericComponent],
            providers: []
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxNumericComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement.nativeElement.querySelector('input');
                component._value = 7011;
                component._previousValue = 7011;
                component.min = 1;
                component.max = 65535;
                fixture.detectChanges();
            });
    }));

    it('should create NumericComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should call checkValue on keydown', () => {
        const spy = spyOn(component, 'checkValue');

        keyEvent(el, '5', 'keydown');
        fixture.detectChanges();
        expect(spy.calls.count()).toBe(1, 'checkValue method should be called once');
    });

    it('should call setValue on keyup', () => {
        const spy = spyOn(component, 'setValue');

        keyEvent(el, '5', 'keyup');
        fixture.detectChanges();
        expect(spy.calls.count()).toBe(1, 'setValue method should be called once');
    });

    it('should check and accept valid value', () => {
        // key event from the test doesn't not change the value so here we'll mimic it
        component._value = 701;
        keyEvent(el, '5', 'keyup');
        fixture.detectChanges();

        expect(component._value).toBe(701);
    });

    it('should check and correct a value greater than max', () => {
        component._value = component.max + 1;
        keyEvent(el, '5', 'keyup');
        fixture.detectChanges();

        expect(component._value).toBe(component.max);
    });

    it('should check and correct a value less than min', () => {
        component._value = component.min - 1;
        keyEvent(el, '5', 'keyup');
        fixture.detectChanges();

        expect(component._value).toBe(component.min);
    });

    it('should check and reject invalid value onPaste', () => {
        const dt = new DataTransfer();
        const event = new ClipboardEvent('paste', { clipboardData: dt });
        event.clipboardData.setData('text/plain', 'test');

        component.onPaste(event);
        fixture.detectChanges(); // NaN here
        fixture.detectChanges();

        expect(component._value).toBe(component._previousValue);
    });

    it('should check and sanitize invalid value onPaste', () => {
        const dt = new DataTransfer();
        const event = new ClipboardEvent('paste', { clipboardData: dt });
        event.clipboardData.setData('text/plain', '70-e3');

        component.onPaste(event);
        fixture.detectChanges();

        expect(component._value).toBe(703);
    });

    it('should check and reject invalid value on valueChange', () => {
        const event = { target: { value: component.min - 1 } };
        component.valueChanged(event);
        fixture.detectChanges();

        expect(component._value).toBe(component._previousValue);

        event.target.value = component.max + 1;
        component.valueChanged(event);
        fixture.detectChanges();

        expect(component._value).toBe(component._previousValue);
    });

    it('should check and accept valid value on valueChange', () => {
        const event = { target: { value: 8011 } };
        component.valueChanged(event);
        fixture.detectChanges();

        expect(component._value).toBe(8011);
    });
});
