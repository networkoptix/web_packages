import {
    Directive, ElementRef, Renderer2, Input, HostListener, HostBinding, forwardRef, OnInit, EventEmitter, Output, Inject, SimpleChanges
} from '@angular/core';
import {
    ControlValueAccessor, NG_VALUE_ACCESSOR
} from '@angular/forms';

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
        This directive makes any text field editable and binds value. Applies default styling if none specified.

        Example usage:
            <h2 NxEditable
                [(content)]="model"
                [hasError]="booleanIfError"
                class="nothing-special-here"
                initialClass ="optional-initial-class"
                editClass="optional-edit-class"
                errorClass="optional-error-class"
            ></h2>

        Instructions:
            Add NxEditable directive to component.
            Use ngModel to bind elements value to model.
            Use hasError to toggle errorClass.
            Use class and and other attributes like normal.
            Use initialClass to over-ride default styling in initial mode.
            Use editClass to over-ride default styling in edit mode.
            Use errorClass over-ride default styling  in edit mode.
    */
    @Input() propValueAccessor = 'textContent';
    @HostBinding('attr.contenteditable') @Input() nxEditable = true;
    @Input() editClass = 'editable-directive-edit';
    @Input() initialClass = 'editable-directive-initial';
    @Input() errorClass = 'editable-directive-error';
    @Input() hasError: boolean;
    @HostBinding('attr.innerHTML') innerHTML;

    private _elementClass: string[] = [];

    @Input()
    @HostBinding('class')
    get elementClass(): string {
        return this._elementClass.join(' ');
    }

    set elementClass(val: string) {
        this._elementClass = val.split(' ');
    }

    contentValue : string;

    @Output()
    contentChange = new EventEmitter<string>();

    @Input()
    get content() {
        return this.contentValue;
    }

    set content(curValue) {
        this.contentValue = curValue;
        this.contentChange.emit(this.contentValue);
        this.elementRef.nativeElement[this.propValueAccessor] = this.innerHTML = this.contentValue;
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

    ngOnChanges(changes: SimpleChanges) {
        this.checkError();
    }

    // toggle mode handlers

    editOn() {
        this.addClass(this.editClass);
        this.removeClass(this.initialClass);
    }

    editOff() {
        this.removeClass(this.editClass, this.errorClass);
        this.addClass(this.initialClass);
    }

    checkError() {
        if (this.hasError) {
            this.addClass(this.errorClass);
        } else {
            this.removeClass(this.errorClass);
        }
    }

    // Helper methods for updating classes

    addClass(...classToAdd: string[]) {
        this.elementClass = `${this.elementClass} ${classToAdd.join(' ')}`;
    }

    removeClass(...classToRemove: string[]) {
        this.elementClass = this._elementClass.filter(currentClass => !classToRemove.find(toRemove => toRemove === currentClass)).join(' ');
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
        this.content = this.elementRef.nativeElement[this.propValueAccessor];
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
        this.elementRef.nativeElement.blur();
        this.elementRef.nativeElement.innerHTML = '';
        setTimeout(() => {
            this.elementRef.nativeElement.innerHTML = this.content;
        }, 0);
    }

    @HostListener('focus')
    callOnFocus() {
        this.editOn();
        if (typeof this.onFocus === 'function') {
            this.onFocus();
        }
    }

    @HostListener('keyup.enter')
    callOnEnter() {
        this.callOnTouched();
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
