import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core';
import {
    ControlValueAccessor,
    FormsModule,
    NG_VALUE_ACCESSOR,
    NgForm,
    NgModel,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import staticLang from '@language_static';

@Component({
    selector: 'nx-2fa-code-input',
    templateUrl: '2fa-code-input.component.html',
    styleUrls: ['2fa-code-input.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => Nx2faCodeInputComponent),
            multi: true,
        },
    ],
})
export class Nx2faCodeInputComponent implements ControlValueAccessor {
    @Input() codeForm: NgForm;

    @ViewChild('codeInputModel') private codeInputModel: NgModel;
    @ViewChild('codeInput') private codeInputRef: ElementRef<HTMLInputElement>;
    private get element(): HTMLInputElement {
        return this.codeInputRef.nativeElement;
    }

    tfaCode: string;

    LANG = staticLang;

    disable(): void {
        this.element.disabled = true;
    }

    enable(): void {
        this.element.disabled = false;
    }

    private focus(): void {
        this.element.disabled = false;
        this.element.focus();
    }

    markAsDirty(): void {
        this.codeInputModel.control.markAsDirty();
    }

    setUnauthorized(): void {
        this.codeForm.control.setErrors({ unauthorized: true });
        /* Need to set parent form as having errors to prevent submitting a value just rejected
        by server, an unfortunate side effect of the way forms work with the current
        state of the 2fa code input. */
        this.codeInputModel.control.setErrors({ unauthorized: true });
        this.focus();
    }

    onChange = (_: string): void => {};
    onTouched = (): void => {};

    writeValue(value: string): void {
        this.tfaCode = value;
        this.onChange(value);
        this.onTouched();
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
}
