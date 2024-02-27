import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@language_static';
import { simpleEmailRegex, simplePhoneRegex, simpleURLRegex } from '@static-variables';

@Injectable({
    providedIn: 'root',
})
export class NxValidators {
    LANG = staticLang;

    constructor(private translate: TranslateService) {}

    // to be used only with nx-info-form for now as it target FormArray
    // if any other usage is required - some mods need to be made.
    uniqueNumber(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            const numbers = control.parent?.parent; // target FormArray controls

            let unique = [];

            if (numbers?.controls) {
                // @ts-expect-error mistype
                unique = numbers?.controls.filter(number => {
                    return (
                        number.controls.data.value.replace(/[^0-9]+/g, '') ===
                        value.replace(/[^0-9]+/g, '')
                    );
                });
            }

            // const phoneInvalid = new RegExp(simplePhoneRegex).test(value);

            return unique.length > 1 // match self and another one
                ? {
                      phoneInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.phoneNotUnique),
                  }
                : null;
        };
    }

    phone(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!value) {
                return null;
            }

            const phoneInvalid = new RegExp(simplePhoneRegex).test(value);

            return !phoneInvalid
                ? {
                      phoneInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.phoneInvalid),
                  }
                : null;
        };
    }

    URL(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!value) {
                return null;
            }

            const urlInvalid = new RegExp(simpleURLRegex).test(value);

            return !urlInvalid
                ? {
                      siteInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.siteInvalid),
                  }
                : null;
        };
    }
    email(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!value) {
                return null;
            }

            const emailInvalid = new RegExp(simpleEmailRegex).test(value);

            return !emailInvalid
                ? {
                      emailInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.emailInvalid),
                  }
                : null;
        };
    }
}
