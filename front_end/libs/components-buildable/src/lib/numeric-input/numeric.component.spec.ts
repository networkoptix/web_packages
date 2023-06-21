import { setupComponent } from '../../setup';

import {
    NxNumericComponent
} from './numeric.component';

function keyEvent(el: HTMLInputElement, key: string, eventType: string): void {
    const event: KeyboardEvent = new KeyboardEvent(eventType, {
        key
    });
    el.dispatchEvent(event);
}

describe('NumericComponent', () => {
    it('should create NumericComponent', async () => {
        const { component } = await setupComponent(NxNumericComponent);
        expect(component).toBeTruthy();
    });

    it('should call checkValue on keydown', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        const el = fixture.debugElement.nativeElement.querySelector('input');
        const checkValueSpy = jest.spyOn(component, 'checkValue');

        keyEvent(el, '5', 'keydown');
        fixture.detectChanges();
        expect(checkValueSpy.mock.calls.length).toBe(1);
    });

    it('should call setValue on keyup', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        const el = fixture.debugElement.nativeElement.querySelector('input');
        const setValueSpy = jest.spyOn(component, 'setValue');

        keyEvent(el, '5', 'keyup');
        fixture.detectChanges();
        expect(setValueSpy.mock.calls.length).toBe(1);
    });

    it('should check and accept valid value', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        const el = fixture.debugElement.nativeElement;
        // key event from the test doesn't not change the value so here we'll mimic it
        component._value = 701;
        keyEvent(el, '5', 'keyup');
        fixture.detectChanges();

        expect(component._value).toBe(701);
    });

    it('should check and correct a value greater than max', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        component.min = 69;
        component.max = 420;
        const el = fixture.debugElement.nativeElement.querySelector('input');
        component._value = component.max + 1;
        keyEvent(el, '80085', 'keyup');
        fixture.detectChanges();

        expect(component._value).toBe(component.max);
    });

    it('should check and correct a value less than min', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        component.min = 69;
        component.max = 420;
        const el = fixture.debugElement.nativeElement.querySelector('input');
        component._value = component.min - 1;
        keyEvent(el, '42', 'keyup');
        fixture.detectChanges();

        expect(component._value).toBe(component.min);
    });

    it('should check and reject invalid value onPaste', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        const dt = new DataTransfer();
        const event = new ClipboardEvent('paste', { clipboardData: dt });
        event.clipboardData?.setData('text/plain', 'test');

        component.onPaste(event);
        fixture.detectChanges(); // NaN here
        fixture.detectChanges();

        expect(component._value).toBe(component._previousValue);
    });

    it('should check and sanitize invalid value onPaste', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        const dt = new DataTransfer();
        const event = new ClipboardEvent('paste', { clipboardData: dt });
        event.clipboardData?.setData('text/plain', '70-e3');

        component.onPaste(event);
        fixture.detectChanges();

        expect(component._value).toBe(703);
    });

    it('should check and reject invalid value on valueChange', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        component._previousValue = 420;
        component.min = 69;
        component.max = 80085;
        const event = { target: { value: 1 } };
        component.valueChanged(event);
        fixture.detectChanges();

        expect(component._value).toBe(component._previousValue);

        event.target.value = component.max + 1;
        component.valueChanged(event);
        fixture.detectChanges();

        expect(component._value).toBe(component._previousValue);
    });

    it('should check and accept valid value on valueChange', async () => {
        const { component, fixture } = await setupComponent(NxNumericComponent);
        component.min = 69;
        component.max = 80085;
        const value = 420;
        const event = { target: { value } };
        component.valueChanged(event);
        fixture.detectChanges();

        expect(component._value).toBe(value);
    });
});
