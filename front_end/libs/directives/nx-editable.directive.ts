import {
    Directive,
    ElementRef,
    Input,
    HostListener,
    HostBinding,
    OnInit,
    EventEmitter,
    Output,
} from '@angular/core';

import { NgChanges } from '@utils/ng-changes';

@Directive({
    selector: '[NxEditable]',
})
export class NxEditableDirective implements OnInit {
    /*  DEPRECATED -> use NxTextEditableComponent

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
    @Input() editClass = 'editable-directive-edit';
    @Input() initialClass = 'editable-directive-initial';
    @Input() errorClass = 'editable-directive-error';
    @Input() hasError: boolean;
    @HostBinding('attr.contenteditable') @Input() nxEditable = true;
    @HostBinding('attr.innerText') innerText;

    private _elementClass: string[] = [];
    private contentValue: string;

    @Input()
    @HostBinding('class')
    get elementClass(): string {
        return this._elementClass.join(' ');
    }

    set elementClass(val: string) {
        this._elementClass = val.split(' ');
    }

    @Input()
    get content() {
        return this.contentValue;
    }

    set content(curValue) {
        this.contentValue = curValue;
        this.contentChange.emit(this.contentValue);
        this.innerText = this.contentValue;

        // Avoid redundant updates while editing. In FF this will cause caret repositioning to 0 - TT
        if (this.elementRef.nativeElement[this.propValueAccessor] !== this.contentValue) {
            this.elementRef.nativeElement[this.propValueAccessor] = this.contentValue;
        }
    }

    @Output()
    contentChange = new EventEmitter<string>();

    constructor(private elementRef: ElementRef) {}

    ngOnInit(): void {
        this.editOff();
    }

    ngOnChanges(changes: NgChanges<NxEditableDirective>): void {
        this.checkError();
    }

    // toggle mode handlers
    editOn(): void {
        this.addClass(this.editClass);
        this.removeClass(this.initialClass);
    }

    editOff(): void {
        this.removeClass(this.editClass, this.errorClass);
        this.addClass(this.initialClass);
    }

    checkError(): void {
        if (this.hasError) {
            this.addClass(this.errorClass);
        } else {
            this.removeClass(this.errorClass);
        }
    }

    // Helper methods for updating classes
    addClass(...classToAdd: string[]): void {
        this.elementClass = `${this.elementClass} ${classToAdd.join(' ')}`;
    }

    removeClass(...classToRemove: string[]): void {
        this.elementClass = this._elementClass
            .filter(currentClass => !classToRemove.find(toRemove => toRemove === currentClass))
            .join(' ');
    }

    // Updated event handlers: Add event handling used by directive here then call event handler from DOM element
    @HostListener('input')
    callOnChange(): void {
        this.content = this.elementRef.nativeElement[this.propValueAccessor];
    }

    @HostListener('blur')
    callOnTouched(): void {
        this.editOff();
        this.elementRef.nativeElement.blur();
        this.elementRef.nativeElement.innerText = '';
        setTimeout(() => {
            this.elementRef.nativeElement.innerText = this.content;
        });
    }

    @HostListener('focus')
    callOnFocus(): void {
        this.editOn();
    }

    @HostListener('keyup.enter')
    callOnEnter(): void {
        this.callOnTouched();
    }
}
