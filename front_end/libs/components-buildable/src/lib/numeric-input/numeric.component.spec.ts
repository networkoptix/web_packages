import { ComponentFixture } from '@angular/core/testing';

import { setupComponent } from '../../setup';

import { NxNumericComponent } from './numeric.component';

function dispatchKeyEvent(el: HTMLInputElement, eventType: string, key: string): KeyboardEvent {
    const event = new KeyboardEvent(eventType, {
        key,
    });
    el.dispatchEvent(event);

    return event;
}

function dispatchInputEvent(el: HTMLInputElement, value = '0'): Event {
    const event = new Event('input');
    el.dispatchEvent(event);
    return event;
}

function dispatchMouseEvent(el: HTMLElement, eventType: string): MouseEvent {
    const event = new MouseEvent(eventType);
    el.dispatchEvent(event);
    return event;
}

function createPasteEvent(data: string): ClipboardEvent {
    const dt = new DataTransfer();
    const event = new ClipboardEvent('paste', { clipboardData: dt });
    event.clipboardData.setData('text/plain', data);

    return event;
}

function dispatchPasteEvent(el: HTMLInputElement): Event {
    // JSDOM does not support `ClipboardEvent` in version <= 22
    const event: Event = new Event('paste');

    el.dispatchEvent(event);

    return event;
}

describe('NumericComponent', () => {
    let component: NxNumericComponent;
    let fixture: ComponentFixture<NxNumericComponent>;
    let el: HTMLInputElement;
    let up: HTMLInputElement;
    let down: HTMLInputElement;
    const baseValue = 7011;
    const minValue = 1;
    const maxValue = 65535;

    beforeEach(async () => {
        ({ component, fixture } = await setupComponent(NxNumericComponent));

        el = fixture.debugElement.nativeElement.querySelector('input');
        up = fixture.debugElement.nativeElement.querySelector(
            '.spinner-button.spinner-button--increment',
        );
        down = fixture.debugElement.nativeElement.querySelector(
            '.spinner-button.spinner-button--decrement',
        );
        el.value = `${baseValue}`;
        component._value = baseValue;
        component.min = minValue;
        component.max = maxValue;
        fixture.detectChanges();
    });

    it('should create NumericComponent', () => {
        expect(component).toBeTruthy();
        expect(el).toBeDefined();
        expect(up).toBeDefined();
        expect(down).toBeDefined();
    });

    describe('Events', () => {
        it('should call valueChanged on keyup', () => {
            const spy = jest.spyOn(component, 'valueChanged');

            dispatchKeyEvent(el, 'keyup', '5');
            fixture.detectChanges();
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith();
        });

        it('should call valueChanged on input', () => {
            const spy = jest.spyOn(component, 'valueChanged');

            const event = dispatchInputEvent(el);
            fixture.detectChanges();
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith(event);
        });

        it('should call onPaste on paste', () => {
            const spy = jest.spyOn(component, 'onPaste');
            spy.mockImplementation();

            const event = dispatchPasteEvent(el);
            fixture.detectChanges();
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith(event);
        });

        it('should call onKeyDown on keydown', () => {
            const spy = jest.spyOn(component, 'onKeyDown');

            const event = dispatchKeyEvent(el, 'keydown', '5');
            fixture.detectChanges();
            expect(spy).toBeCalledTimes(1);
            expect(spy).toBeCalledWith(event);
        });

        it('should call increment on mousedown', () => {
            const increment = jest.spyOn(component, 'increment');
            const decrement = jest.spyOn(component, 'decrement');

            const mouseEvent = dispatchMouseEvent(up, 'mousedown');
            fixture.detectChanges();

            expect(increment).toBeCalledTimes(1);
            expect(increment).toBeCalledWith(mouseEvent);
            expect(decrement).not.toHaveBeenCalled();
        });
        it('should call decrement on mousedown', () => {
            const increment = jest.spyOn(component, 'increment');
            const decrement = jest.spyOn(component, 'decrement');

            const mouseEvent = dispatchMouseEvent(down, 'mousedown');
            fixture.detectChanges();

            expect(decrement).toBeCalledTimes(1);
            expect(decrement).toBeCalledWith(mouseEvent);
            expect(increment).not.toHaveBeenCalled();
        });
    });

    describe('getNativeValue', () => {
        it('returns value of an input as number', () => {
            el.value = '700';

            expect(component.getNativeValue()).toBe(700);
        });
        it('returns null of an input as empty', () => {
            el.value = '';

            expect(component.getNativeValue()).toBe(null);
        });
    });

    describe('onKeyDown', () => {
        const preventDefault = jest.fn();
        const getEvent = (char: string): KeyboardEvent =>
            ({
                key: char,
                preventDefault,
            } as unknown as KeyboardEvent);

        Array.from('0123456789').map(char =>
            it(`should prevent event if a digit ${char} is received`, () => {
                component.onKeyDown(getEvent(char));
                expect(preventDefault).not.toHaveBeenCalled();
            }),
        );
        Array.from('abe-+/]."').map(char =>
            it(`should prevent event if a digit ${char} is received`, () => {
                component.onKeyDown(getEvent(char));
                expect(preventDefault).toHaveBeenCalled();
            }),
        );
    });

    describe('valueChanged', () => {
        let setValue: jest.SpyInstance;
        let getNativeValue: jest.SpyInstance;
        let checkUpdateNativeValue: jest.SpyInstance;

        beforeEach(async () => {
            checkUpdateNativeValue = jest
                .spyOn(component, 'checkUpdateNativeValue')
                .mockImplementation();
            setValue = jest.spyOn(component, 'setValue').mockImplementation();
            getNativeValue = jest.spyOn(component, 'getNativeValue');
            getNativeValue.mockReturnValue(baseValue);
        });

        it('calls setValue with nativeValue when called internally', () => {
            component.valueChanged();

            expect(getNativeValue).toBeCalledTimes(1);
            expect(getNativeValue).toBeCalledWith();
            expect(setValue).toBeCalledTimes(1);
            expect(setValue).toBeCalledWith(baseValue);
            expect(checkUpdateNativeValue).toBeCalledTimes(0);
        });

        it('calls setValue with nativeValue when called as a listener', () => {
            const mockEvent = new Event('input');
            component.valueChanged(mockEvent);

            expect(getNativeValue).toBeCalledTimes(1);
            expect(getNativeValue).toBeCalledWith();
            expect(setValue).toBeCalledTimes(1);
            expect(setValue).toBeCalledWith(baseValue);
            expect(checkUpdateNativeValue).toBeCalledTimes(1);
            expect(checkUpdateNativeValue).toBeCalledWith(baseValue, mockEvent.target);
        });
    });

    describe('checkUpdateNativeValue', () => {
        let input: { value: string };
        let getNativeValue: jest.SpyInstance;

        beforeEach(() => {
            input = {
                value: `${baseValue}`,
            };
            getNativeValue = jest.spyOn(component, 'getNativeValue');
            getNativeValue.mockReturnValue(baseValue);
        });

        it('does nothing if native and private values match', () => {
            component.checkUpdateNativeValue(baseValue, input as HTMLInputElement);

            expect(input.value).toEqual(`${baseValue}`);
        });
        it('sets new value for event target if native and private values do not match', () => {
            component.checkUpdateNativeValue(baseValue - 1, input as HTMLInputElement);

            expect(input.value).toEqual(`${baseValue - 1}`);
        });
    });

    describe('increment and decrement', () => {
        let event: MouseEvent;
        let preventDefault: jest.SpyInstance;
        let setValue: jest.SpyInstance;

        beforeEach(() => {
            preventDefault = jest.fn();
            event = { preventDefault } as unknown as MouseEvent;
            setValue = jest.spyOn(component, 'setValue');
        });

        it('increments native value and updates internal value', () => {
            component.increment(event);
            fixture.detectChanges();

            expect(preventDefault).toBeCalledTimes(1);
            expect(preventDefault).toBeCalledWith();
            expect(setValue).toBeCalledTimes(1);
            expect(setValue).toBeCalledWith(baseValue + 1);
        });
        it('decrement native value and updates internal value', () => {
            component.decrement(event);
            fixture.detectChanges();

            expect(preventDefault).toBeCalledTimes(1);
            expect(preventDefault).toBeCalledWith();
            expect(setValue).toBeCalledTimes(1);
            expect(setValue).toBeCalledWith(baseValue - 1);
        });
    });

    describe('onPaste', () => {
        let setValue: jest.SpyInstance;

        beforeEach(() => {
            setValue = jest.spyOn(component, 'setValue');
        });

        it('should check and set partially valid value', () => {
            component.onPaste(createPasteEvent('70-e3'));

            expect(setValue).toBeCalledTimes(1);
            expect(setValue).toBeCalledWith(703);
        });

        it('should check and set invalid value', () => {
            component.onPaste(createPasteEvent('test'));

            expect(setValue).toBeCalledTimes(1);
            expect(setValue).toBeCalledWith(NaN);
        });

        it('should check and set valid value', () => {
            component.onPaste(createPasteEvent(`${baseValue}`));

            expect(setValue).toBeCalledTimes(1);
            expect(setValue).toBeCalledWith(baseValue);
        });
    });

    describe('setValue', () => {
        let onTouchedCallback: jest.SpyInstance;
        let onChangeCallback: jest.SpyInstance;
        let onChangeEmit: jest.SpyInstance;

        beforeEach(() => {
            onTouchedCallback = jest.spyOn(component, <never>'onTouchedCallback');
            onChangeCallback = jest.spyOn(component, <never>'onChangeCallback');
            onChangeEmit = jest.spyOn(component.onChange, 'emit');
        });

        const expectSetValue = (value: number | null): void => {
            expect(onTouchedCallback).toBeCalledTimes(1);
            expect(onTouchedCallback).toBeCalledWith();
            expect(onChangeCallback).toBeCalledTimes(1);
            expect(onChangeCallback).toBeCalledWith(value);
            expect(onChangeEmit).toBeCalledTimes(1);
            expect(onChangeEmit).toBeCalledWith(value);
        };

        it('should update value', () => {
            const newValue = baseValue + 1;
            component.setValue(newValue);

            expectSetValue(newValue);
        });

        it('should update null value', () => {
            const newValue: null = null;
            component.setValue(newValue);

            expectSetValue(newValue);
        });

        it('should check and correct a value less than min', () => {
            const newValue = minValue - 1;
            component.setValue(newValue);

            expectSetValue(minValue);
        });

        it('should check and correct a value greater than max', () => {
            const newValue = maxValue + 1;
            component.setValue(newValue);

            expectSetValue(maxValue);
        });

        it('should check and reject NaN', () => {
            component.setValue(NaN);

            expect(onTouchedCallback).not.toHaveBeenCalled();
            expect(onChangeCallback).not.toHaveBeenCalled();
            expect(onChangeEmit).not.toHaveBeenCalled();
        });
    });
});
