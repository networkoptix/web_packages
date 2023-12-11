import { SimpleChange } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';

import { setupComponent } from '../src/setup';

import { NxTextEditableComponent } from './editable.component';

const handleSetup = async (): ReturnType<typeof setupComponent<NxTextEditableComponent>> => {
    const setup = await setupComponent(NxTextEditableComponent);
    setup.component?.writeValue('Test');
    setup.fixture?.detectChanges();
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
        expect(component.overrideSelectionClass).toBe('');
        expect(component.overrideSelectionClassOnce).toBe(false);
        expect(component.editEnabled).toBe(false);
        expect(component.selectAllOnFocus).toBe(false);
        expect(component.allowUserFocus).toBe(true);
        expect(el.innerHTML).toBe('Test');
        expect(el.classList.contains('editable-initial')).toBeTruthy();
    });

    it('should set valid value', async () => {
        const { component, fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        jest.spyOn(component.onFocusChanged, 'emit');

        component.ngOnChanges({
            editEnabled: new SimpleChange(component.editEnabled, !component.editEnabled, true),
        });
        expect(el.getAttribute('contenteditable')).toBe('true');

        el.dispatchEvent(new Event('focus'));
        expect(el.classList.contains('editable-edit')).toBeTruthy();
        expect(component.onFocusChanged.emit).toHaveBeenCalledWith(true);

        el.textContent = 'Sofia';
        el.dispatchEvent(new Event('input'));
        expect(el.innerHTML).toBe('Sofia');

        el.dispatchEvent(new Event('blur'));
        expect(el.classList.contains('editable-initial')).toBeTruthy();
        expect(component.onFocusChanged.emit).toHaveBeenCalledWith(false);
    });

    it('should handle "ENTER" key', async () => {
        const { component, fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        el.dispatchEvent(new Event('focus'));

        const spy = jest.spyOn(component, 'callOnEnter');
        const event = new KeyboardEvent('keyup', {
            key: 'Enter',
        });
        el.dispatchEvent(event);

        expect(el.innerHTML).toBe('Test');
        expect(spy).toBeCalledTimes(1);
    });

    it('should not react to invalid value (not required)', async () => {
        const { fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        el.dispatchEvent(new Event('focus'));

        el.textContent = '';
        el.dispatchEvent(new Event('input'));

        expect(el.classList.contains('editable-error')).toBeFalsy();
    });

    it('should react to invalid value (required)', async () => {
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

    describe('toggleEdit', () => {
        it('should set read state', async () => {
            const { fixture, component } = await handleSetup();
            const el = fixture.elementRef.nativeElement;
            component.toggleEdit(false);
            expect(el.getAttribute('contenteditable')).toBe('false');
            expect(el.getAttribute('disabled')).toBe('true');
        });

        it('should set edit state', async () => {
            const { fixture, component } = await handleSetup();
            const el = fixture.elementRef.nativeElement;
            component.toggleEdit(true);
            expect(el.getAttribute('contenteditable')).toBe('true');
            expect(el.getAttribute('disabled')).toBe('false');
        });
    });

    describe('when overrideClass is defined', () => {
        let fixture: ComponentFixture<NxTextEditableComponent>;
        let component: NxTextEditableComponent;
        let el: HTMLElement;
        beforeEach(async () => {
            const setup = await handleSetup();
            if (!setup.fixture || !setup.component) {
                return;
            }

            fixture = setup.fixture;
            component = setup.component;
            component.overrideSelectionClass = 'override-class';
            el = fixture.elementRef.nativeElement;
            el.dispatchEvent(new Event('focus'));
        });

        it('should add class on focus', async () => {
            expect(el.classList.contains('override-class')).toBeTruthy();
        });

        it('should remove class on blur', async () => {
            el.dispatchEvent(new Event('blur'));
            expect(el.classList.contains('override-class')).toBeFalsy();
        });

        it('should add class on next focus', async () => {
            el.dispatchEvent(new Event('blur'));
            el.dispatchEvent(new Event('focus'));
            expect(el.classList.contains('override-class')).toBeTruthy();
        });
        it('should not add class on next focus when overrideSelectionClassOnce', async () => {
            component.overrideSelectionClassOnce = true;
            el.dispatchEvent(new Event('blur'));
            el.dispatchEvent(new Event('focus'));
            expect(el.classList.contains('override-class')).toBeFalsy();
        });
    });
});
