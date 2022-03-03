import { Directive, forwardRef } from '@angular/core';
import { AbstractControl, Validator, NG_VALIDATORS } from '@angular/forms';

@Directive({
    selector: '[nxUrlValidator]',
    providers: [{
        provide: NG_VALIDATORS,
        useExisting: forwardRef(() => NxUrlValidatorDirective),
        multi: true
    }]
})
export class NxUrlValidatorDirective implements Validator {
    validate = (control: AbstractControl): { [key: string]: any } | null => {
        const ipReg     = new RegExp(/^(https?:\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d{1,5})?$/);
        const domainReg = new RegExp(/^(https?:\/\/)?(([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,})(:\d{1,5})?$/i);
        const forbidden = !ipReg.test(control.value) && !domainReg.test(control.value);
        return forbidden ? { forbiddenUrl: { value: control.value } } : null;
    };
}
