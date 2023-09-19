import {
    Component,
    ElementRef,
    EventEmitter,
    forwardRef,
    HostListener,
    Inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { escape } from 'lodash-es';

import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-text-editable',
    template: '<ng-content></ng-content>',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxTextEditableComponent),
            multi: true,
        },
    ],
    styleUrls: ['editable.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxTextEditableComponent implements OnInit, OnChanges, ControlValueAccessor {
    /*
       USAGE:
           <nx-text-editable
                [(ngModel)]="name"
                ngDefaultControl
                required?="true" [OR] [required]?="isRequired"
                [editEnabled]?="editEnabled"
                (onFocusChanged)?="editModeChanged($event)"
                [ngClass]?="{'has-edit-icon': !editMode}"
            ></nx-text-editable>
    * */

    @Input() editClass = 'editable-edit';
    @Input() initialClass = 'editable-initial';
    @Input() errorClass = 'editable-error';
    @Input() allowUserFocus = true;
    @Input() editEnabled = false;
    @Input() required;

    @Output() onFocusChanged = new EventEmitter<any>();
    @Output() onEditModeCancelled = new EventEmitter<any>();

    private _initialValue: string;

    ngOnChanges(changes: NgChanges<NxTextEditableComponent>) {
        if (changes.editEnabled) {
            this.toggleEdit(changes.editEnabled?.currentValue);

            if (this.allowUserFocus) {
                return;
            }

            const { currentValue, previousValue } = changes.editEnabled;
            if (currentValue && !previousValue) {
                setTimeout(() => {
                    this.el.nativeElement.focus();
                }, 0);
            }
        }
    }

    private focusTextEnd(el: ElementRef) {
        const selection = this.window.getSelection();
        selection.selectAllChildren(el.nativeElement);
        selection.collapseToEnd();
    }

    @HostListener('click', ['$event'])
    callOnClick($event: MouseEvent): void {
        if (this.editEnabled) {
            $event.stopPropagation();
        }
    }

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
        this.onFocusChanged.emit(false);
        this.onTouchedCallback();
    }

    @HostListener('focus')
    callOnFocus(): void {
        this.el.nativeElement.classList.remove(this.initialClass);
        this.el.nativeElement.classList.add(this.editClass);
        this.onFocusChanged.emit(true);

        if (!this.allowUserFocus) {
            this.focusTextEnd(this.el);
        }
    }

    @HostListener('keyup.enter')
    callOnEnter(): void {
        this.el.nativeElement.innerText = this.el.nativeElement.textContent;
        this.el.nativeElement.blur();
    }

    @HostListener('keyup.esc')
    callOnEscape(): void {
        this.onEditModeCancelled.emit();
        this.el.nativeElement.textContent = this._initialValue;
        this.el.nativeElement.blur();
    }

    // Placeholders for the callbacks which are later provided
    // by the Control Value Accessor
    private onTouchedCallback = (): void => {};
    private onChangeCallback = (_: any): void => {};

    constructor(private el: ElementRef, @Inject(WINDOW) public window: Window) {}

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
        if ((!this._initialValue && value) || value) {
            // do not update before component is initialized
            this._initialValue = value;
            this.el.nativeElement.textContent = value || '';
            this.el.nativeElement.classList.add(this.initialClass);
            if (this.editEnabled) {
                this.el.nativeElement.setAttribute('contenteditable', 'true');
            }
            this.checkError();
        }
    }

    registerOnChange(fn): void {
        this.onChangeCallback = fn;
    }

    registerOnTouched(fn): void {
        this.onTouchedCallback = fn;
    }

    toggleEdit(isEditEnabled: boolean): void {
        this.el.nativeElement.setAttribute('disabled', String(!isEditEnabled));
        this.el.nativeElement.setAttribute('contenteditable', String(isEditEnabled));
    }
}
