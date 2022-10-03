import {
    ComponentFixture,
    fakeAsync,
    TestBed,
    tick,
    waitForAsync
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { NxTextEditableComponent } from './editable.component';

describe('NxTextEditableComponent', () => {
    let component: NxTextEditableComponent;
    let fixture: ComponentFixture<NxTextEditableComponent>;
    let el: HTMLElement;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                imports: [FormsModule],
                declarations: [NxTextEditableComponent],
                providers: []
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxTextEditableComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement.nativeElement;
        component.writeValue('Test');

        fixture.detectChanges();
    }));

    it('should create NxTextEditableComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize component', () => {
        expect(component.initialClass).toBe('editable-initial');
        expect(component.editClass).toBe('editable-edit');
        expect(component.errorClass).toBe('editable-error');
        expect(el.innerHTML).toBe('Test');
        expect(el.classList.contains('editable-initial')).toBeTrue();
    });

    it('should set valid value', fakeAsync(() => {
        spyOn(component.onEditModeChanged, 'emit');

        el.dispatchEvent(new Event('focus'));
        tick();
        expect(el.getAttribute('contenteditable')).toBe('true');
        expect(el.classList.contains('editable-edit')).toBeTrue();
        expect(component.onEditModeChanged.emit).toHaveBeenCalledWith(true);

        el.textContent = 'Sofia';
        el.dispatchEvent(new Event('input'));
        tick();
        expect(el.innerHTML).toBe('Sofia');

        el.dispatchEvent(new Event('blur'));
        tick();
        expect(el.classList.contains('editable-initial')).toBeTrue();
        expect(component.onEditModeChanged.emit).toHaveBeenCalledWith(false);
    }));

    it('should handle "ENTER" key', fakeAsync(() => {
        el.dispatchEvent(new Event('focus'));
        tick();

        const spy = spyOn(component, 'callOnEnter');
        const event = new KeyboardEvent('keyup', {
            key: 'Enter'
        });
        el.dispatchEvent(event);
        tick();
        expect(el.innerHTML).toBe('Test');
        expect(spy.calls.count()).toBe(1);
    }));

    it('should not react on invalid value (not required)', fakeAsync(() => {
        el.dispatchEvent(new Event('focus'));
        tick();

        el.textContent = '';
        el.dispatchEvent(new Event('input'));
        tick();
        expect(el.classList.contains('editable-error')).toBeFalse();
    }));

    it('should react on invalid value (required)', fakeAsync(() => {
        component.required = true;
        el.dispatchEvent(new Event('focus'));
        tick();

        el.textContent = '';
        el.dispatchEvent(new Event('input'));
        tick();
        expect(el.classList.contains('editable-error')).toBeTrue();
    }));

    it('should retain original value if invalid (required)', fakeAsync(() => {
        component.required = true;
        el.dispatchEvent(new Event('focus'));
        tick();
        el.textContent = '';
        el.dispatchEvent(new Event('input'));
        tick();
        el.dispatchEvent(new Event('blur'));
        tick();
        expect(el.innerHTML).toBe('Test');
    }));

    it('should set disabled state', fakeAsync(() => {
        component.setDisabledState(true);
        expect(el.getAttribute('contenteditable')).toBe('false');
        expect(el.getAttribute('disabled')).toBe('true');
    }));
});
