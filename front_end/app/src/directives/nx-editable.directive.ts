import {
    Directive,
    ElementRef,
    Renderer2,
    HostListener,
    HostBinding,
    forwardRef,
    Input
} from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
    // tslint:disable-next-line:directive-selector
    selector : '[NxEditable]',
    providers : [
        {
            provide : NG_VALUE_ACCESSOR,
            useExisting : forwardRef(() => NxEditableDirective),
            multi : true
        }
    ]
})
export class NxEditableDirective implements ControlValueAccessor {
    /*
        This directive makes any text field editable and binds value.

        Example usage:
            <h2 NxEditable [(ngModel)]="selectedCamera.name" [editClass]="editClass" class="normal"></h2>

        Instructions:
            Add NxEditable directive to component.
            Use ngModel to bind elements value to model.
            Use editClass add classes when the component is in edit mode.
            Use class and and other attributes like normal.

    */
    @Input() propValueAccessor = 'textContent';
    @HostBinding('attr.contenteditable') @Input() nxEditable = true;
    @Input('editClass') editClass = '';

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
    private removeDisabledState: () => void;

    constructor(private elementRef: ElementRef, private renderer: Renderer2) {
    }

    removeEditClass() {
        this.elementClass = this._elementClass.filter(currentClass => currentClass !== this.editClass).join(' ');
    }

    addEditClass() {
        this.elementClass = `${this.elementClass} ${this.editClass}`;
    }

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
        this.removeEditClass();
        if (typeof this.onTouched === 'function') {
            this.onTouched();
        }
    }

    @HostListener('focus')
    callOnFocus() {
        this.addEditClass();
    }

    /**
     * Writes a new value to the element.
     * This method will be called by the forms API to write
     * to the view when programmatic (model -> view) changes are requested.
     *
     * See: [ControlValueAccessor](https://angular.io/api/forms/ControlValueAccessor#members)
     */
    writeValue(value: any): void {
        const normalizedValue = value == null ? '' : value;
        this.renderer.setProperty(
            this.elementRef.nativeElement,
            this.propValueAccessor,
            normalizedValue
        );
    }

    /**
     * Registers a callback function that should be called when
     * the control's value changes in the UI.
     *
     * This is called by the forms API on initialization so it can update
     * the form model when values propagate from the view (view -> model).
     */
    registerOnChange(fn: () => void): void {
        this.onChange = fn;
    }

    /**
     * Registers a callback function that should be called when the control receives a blur event.
     * This is called by the forms API on initialization so it can update the form model on blur.
     */
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    /**
     * This function is called by the forms API when the control status changes to or from "DISABLED".
     * Depending on the value, it should enable or disable the appropriate DOM element.
     */
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
