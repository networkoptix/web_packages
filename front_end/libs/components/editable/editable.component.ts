import {
    Component,
    ElementRef,
    HostListener,
    forwardRef,
    Input,
    EventEmitter,
    Output,
    ViewEncapsulation,
    OnInit
} from '@angular/core';
import {
    ControlValueAccessor,
    NG_VALUE_ACCESSOR
} from '@angular/forms';
import { escape } from 'lodash-es';

@Component({
    selector: 'nx-text-editable',
    template: '<ng-content></ng-content>',
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        useExisting: forwardRef(() => NxTextEditableComponent),
        multi: true
    }],
    styleUrls: ['editable.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxTextEditableComponent implements OnInit, ControlValueAccessor {
    /*
       USAGE:
           <nx-text-editable
                [(ngModel)]="name"
                ngDefaultControl
                required?="true" [OR] [required]?="isRequired"
                [disabled]?="!editEnabled"
                (onEditModeChanged)?="editModeChanged($event)"
                [ngClass]?="{'has-edit-icon': !editMode}"
            ></nx-text-editable>
    * */

    @Input() editClass = 'editable-edit';
    @Input() initialClass = 'editable-initial';
    @Input() errorClass = 'editable-error';
    @Input() required;

    @Output() onEditModeChanged = new EventEmitter<any>();

    private _initialValue: string;
    private _disabled: boolean;

    @HostListener('input')
    callOnChange(): void {
        this.onChangeCallback(this.el.nativeElement.textContent);
        this.checkError();
    }

    @HostListener('blur')
    callOnTouched(): void {
        // set caret to beginning of the input so no weird ellipses
        this.el.nativeElement.scrollLeft = 0;

        if (this.required && !this.el.nativeElement.textContent) {
            this.el.nativeElement.textContent = this._initialValue;
            this.el.nativeElement.classList.remove(this.errorClass);
            this.onChangeCallback(this.el.nativeElement.textContent);
        }

        // Hide red spellcheck lines
        this.el.nativeElement.innerHTML = escape(this.el.nativeElement.textContent);

        this.el.nativeElement.classList.remove(this.editClass);
        this.el.nativeElement.classList.add(this.initialClass);
        this.onEditModeChanged.emit(false);
        this.onTouchedCallback();
    }

    @HostListener('focus')
    callOnFocus(): void {
        this.el.nativeElement.classList.remove(this.initialClass);
        this.el.nativeElement.classList.add(this.editClass);
        this.onEditModeChanged.emit(true);
    }

    @HostListener('keyup.enter')
    callOnEnter(): void {
        this.el.nativeElement.innerText = this.el.nativeElement.textContent;
        this.el.nativeElement.blur();
    }

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {};
    private onChangeCallback = (_: any): void => {};

    constructor(
        private el: ElementRef
    ) {}

    ngOnInit(): void {
        this.required = Boolean(this.required); // handle "undefined" and string values
        // disabled state is controller by "setDisabledState"
    }

    private checkError(): void {
        if (this.required && !this.el.nativeElement.textContent) {
            this.el.nativeElement.classList.add(this.errorClass);
        } else {
            this.el.nativeElement.classList.remove(this.errorClass);
        }
    }

    // called when model is written to view. (model -> view)
    writeValue(value: string): void {
        if (!this._initialValue && value || value) { // do not update before component is initialized
            this._initialValue = value;
            this.el.nativeElement.textContent = value || '';
            this.el.nativeElement.classList.add(this.initialClass);
            !this._disabled && this.el.nativeElement.setAttribute('contenteditable', 'true');
            this.checkError();
        }
    }

    registerOnChange(fn): void {
        this.onChangeCallback = fn;
    }

    registerOnTouched(fn): void {
        this.onTouchedCallback = fn;
    }

    // called when element property disabled is changed
    setDisabledState(val: boolean): void {
        this._disabled = val;
        this.el.nativeElement.setAttribute('disabled', String(val));
        this.el.nativeElement.setAttribute('contenteditable', String(!val));
    }
}
