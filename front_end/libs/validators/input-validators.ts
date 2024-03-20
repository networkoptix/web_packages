import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import staticLang from '@language_static';
import { simpleEmailRegex, simplePhoneRegex, simpleURLRegex } from '@static-variables';
import { UserRecord } from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Injectable({
    providedIn: 'root',
})
export class NxValidators {
    LANG = staticLang;

    constructor(private translate: TranslateService) {}

    requiredURL(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            return control.value.length === 0
                ? {
                      siteInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.siteRequired),
                  }
                : null;
        };
    }

    requiredPhone(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            return control.value.length === 0
                ? {
                      phoneInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.phoneRequired),
                  }
                : null;
        };
    }

    requiredEmail(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            return control.value.length === 0
                ? {
                      emailInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.emailRequired),
                  }
                : null;
        };
    }

    // to be used only with nx-info-form for now as it target FormArray
    // if any other usage is required - some mods need to be made.
    uniqueNumber(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            const numbers = control.parent?.parent; // target FormArray controls

            let unique: AbstractControl[] = [];

            if (numbers?.controls) {
                // @ts-expect-error mistype
                unique = numbers?.controls.filter(number => {
                    return (
                        number.controls.data.value.replace(/[^0-9]+/g, '') ===
                        value.replace(/[^0-9]+/g, '')
                    );
                });
            }

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

    uniqueEmail(existingEmails: Map<String, UserRecord>): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }
            const user = existingEmails.get(control.value);
            if (!user) {
                return null;
            }
            return user.rolesIds.includes(OrgRoleIds.OrgAdmin)
                ? {
                      existingEmail: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.emailNotUnique),
                  }
                : null;
        };
    }

    requiredLabel(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            return control.value.length === 0
                ? {
                      labelInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.labelRequired),
                  }
                : null;
        };
    }

    requiredValue(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            return control.value.length === 0
                ? {
                      valueInvalid: true,
                      msg: this.translate.instant(this.LANG.customValidatorMsg.valueRequired),
                  }
                : null;
        };
    }
}
