import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Self } from '@angular/core';
import { FormControl, NgControl } from '@angular/forms';

import { NxFormFieldControlDirective } from '../form-field/form-field-control.directive';

/** Native `<input>` element enhanced for form field.
 *
 * PITFALL: If you forget to import this in a component before using it the error will be
 *
 * `ERROR TypeError: can't access property "host", this.nxControlDirective is undefined`
 *
 * in the console and not a `'nx-input' is not a known element` error in the template.
 */
@Component({
    selector: 'input[nx-input]',
    template: '', // No internals for <input />
    styleUrls: ['input.component.scss'],
    standalone: true,
    imports: [],
    hostDirectives: [NxFormFieldControlDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxInputComponent {
    @HostListener('blur') onBlur(): void {
        const control = this.control.control as FormControl<string>;
        if (control.untouched) {
            control.markAsTouched();
            control.updateValueAndValidity();
        }
    }

    constructor(
        @Self() private control: NgControl,
        { nativeElement }: ElementRef<HTMLInputElement>,
    ) {
        nativeElement.classList.add('fs-mask');
        if (!nativeElement.type) {
            nativeElement.type = 'text';
        } else if (nativeElement.type === 'email') {
            nativeElement.autocomplete = 'email';
            nativeElement.spellcheck = false;
            nativeElement.name ||= 'email'; // This seems required for Firefox autocomplete
        } else if (nativeElement.type === 'tel') {
            nativeElement.autocomplete = 'tel';
            nativeElement.spellcheck = false;
        } else if (nativeElement.type === 'url') {
            nativeElement.spellcheck = false;
        }
    }
}
