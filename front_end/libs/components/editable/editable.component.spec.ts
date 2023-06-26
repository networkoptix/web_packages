import { setupComponent } from '../src/setup';

import { NxTextEditableComponent } from './editable.component';

const handleSetup = async (): ReturnType<typeof setupComponent<NxTextEditableComponent>> => {
    const setup = await setupComponent(NxTextEditableComponent);
    setup.component.writeValue('Test');
    setup.fixture.detectChanges();
    return setup;
};

describe('NxTextEditableComponent', () => {
    it('should create NxTextEditableComponent', async () => {
        const { component } = await handleSetup();
        expect(component).toBeTruthy();
    });

    it('should initialize component', async () => {
        const { component, fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        expect(component.initialClass).toBe('editable-initial');
        expect(component.editClass).toBe('editable-edit');
        expect(component.errorClass).toBe('editable-error');
        expect(el.innerHTML).toBe('Test');
        expect(el.classList.contains('editable-initial')).toBeTruthy();
    });

    it('should set valid value', async () => {
        const { component, fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        jest.spyOn(component.onEditModeChanged, 'emit');

        el.dispatchEvent(new Event('focus'));
        expect(el.getAttribute('contenteditable')).toBe('true');
        expect(el.classList.contains('editable-edit')).toBeTruthy();
        expect(component.onEditModeChanged.emit).toHaveBeenCalledWith(true);

        el.textContent = 'Sofia';
        el.dispatchEvent(new Event('input'));
        expect(el.innerHTML).toBe('Sofia');

        el.dispatchEvent(new Event('blur'));
        expect(el.classList.contains('editable-initial')).toBeTruthy();
        expect(component.onEditModeChanged.emit).toHaveBeenCalledWith(false);
    });

    it('should handle "ENTER" key', async () => {
        const { component, fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        el.dispatchEvent(new Event('focus'));

        const spy = jest.spyOn(component, 'callOnEnter');
        const event = new KeyboardEvent('keyup', {
            key: 'Enter'
        });
        el.dispatchEvent(event);

        expect(el.innerHTML).toBe('Test');
        expect(spy).toBeCalledTimes(1);
    });

    it('should not react on invalid value (not required)', async () => {
        const { fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        el.dispatchEvent(new Event('focus'));

        el.textContent = '';
        el.dispatchEvent(new Event('input'));

        expect(el.classList.contains('editable-error')).toBeFalsy();
    });

    it('should react on invalid value (required)', async () => {
        const { fixture, component } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        component.required = true;

        el.dispatchEvent(new Event('focus'));

        el.textContent = '';
        el.dispatchEvent(new Event('input'));

        expect(el.classList.contains('editable-error')).toBeTruthy();
    });

    it('should retain original value if invalid (required)', async () => {
        const { fixture, component } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        component.required = true;
        el.dispatchEvent(new Event('focus'));

        el.textContent = '';
        el.dispatchEvent(new Event('input'));

        el.dispatchEvent(new Event('blur'));

        expect(el.innerHTML).toBe('Test');
    });

    it('should set disabled state', async () => {
        const { fixture, component } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        component.setDisabledState(true);
        expect(el.getAttribute('contenteditable')).toBe('false');
        expect(el.getAttribute('disabled')).toBe('true');
    });
});
