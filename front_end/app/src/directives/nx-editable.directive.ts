import {
    Directive, ElementRef, Renderer2, Input, HostListener, HostBinding, forwardRef, OnInit
}                                                  from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
    selector  : '[NxEditable]',
    providers : [
        {
            provide     : NG_VALUE_ACCESSOR,
            useExisting : forwardRef(() => NxEditableDirective),
            multi       : true
        }
    ]
})
export class NxEditableDirective implements ControlValueAccessor, OnInit {
    /*
        This directive makes any text field editable and binds value.

        Example usage:
            <h2 NxEditable [(ngModel)]="bound.model" class="nothing-special-here" initialClass ="initial-class-here" editClass="edit-class-here"></h2>

        Instructions:
            Add NxEditable directive to component.
            Use ngModel to bind elements value to model.
            Use initialClass to add class for when component is in initial mode.
            Use editClass to add class for when the component is in edit mode.
            Use class and and other attributes like normal.

    */
    @Input() propValueAccessor = 'textContent';
    @HostBinding('attr.contenteditable') @Input() nxEditable = true;
    @Input('editClass') editClass = '';
    @Input('initialClass') initialClass = '';

    private _elementClass: string[] = [];

    @Input('class')
    @HostBinding('class')
    get elementClass(): string {
        return this._elementClass.join(' ');
    }

    set elementClass(val: string) {
        this._elementClass = val.split(' ');
    }

    private onChange: (value: string) => void;
    private onTouched: () => void;
    private onFocus: () => void;
    private removeDisabledState: () => void;

    constructor(private elementRef: ElementRef, private renderer: Renderer2) {
    }

    ngOnInit() {
        this.editOff();
    }

    // toggle mode handlers

    editOn() {
        this.addEditClass();
        this.removeInitialClass();
    }

    editOff() {
        this.removeEditClass();
        this.addInitialClass();
    }

    // Helper methods for updating classes

    removeEditClass() {
        this.elementClass = this._elementClass.filter(currentClass => currentClass !== this.editClass).join(' ');
    }

    addEditClass() {
        this.elementClass = `${this.elementClass} ${this.editClass}`;
    }

    removeInitialClass() {
        this.elementClass = this._elementClass.filter(currentClass => currentClass !== this.initialClass).join(' ');
    }

    addInitialClass() {
        this.elementClass = `${this.elementClass} ${this.initialClass}`;
    }

    // Save a reference of event handlers from DOM element that are  being over-ridden by directive to "this"

    registerOnChange(fn: () => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    registerOnFocus(fn: () => void): void {
        this.onFocus = fn;
    }

    // Updated event handlers: Add event handling used by directive here then call event handler from DOM element

    @HostListener('input')
    callOnChange() {
        if (typeof this.onChange === 'function') {
            this.onChange(
                this.elementRef.nativeElement[this.propValueAccessor]
            );
        }
    }

    @HostListener('blur')
    callOnTouched() {
        this.editOff();
        if (typeof this.onTouched === 'function') {
            this.onTouched();
        }
    }

    @HostListener('focus')
    callOnFocus() {
        this.editOn();
        if (typeof this.onFocus === 'function') {
            this.onFocus();
        }
    }

    // Other methods

    writeValue(value: any): void {
        const normalizedValue = value == null ? '' : value;
        this.renderer.setProperty(
            this.elementRef.nativeElement,
            this.propValueAccessor,
            normalizedValue
        );
    }

    setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.renderer.setAttribute(
                this.elementRef.nativeElement,
                'disabled',
                'true'
            );
            this.removeDisabledState = this.renderer.listen(
                this.elementRef.nativeElement,
                'keydown',
                this.listenerDisabledState
            );
        } else {
            if (this.removeDisabledState) {
                this.renderer.removeAttribute(
                    this.elementRef.nativeElement,
                    'disabled'
                );
                this.removeDisabledState();
            }
        }
    }

    private listenerDisabledState(e: KeyboardEvent) {
        e.preventDefault();
    }
}
