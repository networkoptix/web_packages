import type { FormGroupDirective, NgControl } from '@angular/forms';

import { environment } from '@environments/environment';
import { staticImplements } from '@utils/general';

import { ControlPresets } from '../validators';

export interface ControlState {
    key: string;
    data?: unknown;
}

/** A function for when to display errors — on change (immediately), control blur, or form submit.
 *
 * The first matching error from a control's validators array will be selected (ordering matters).
 *
 * Matching should follow the general pattern:
 * 1. Show errors that will not be resolved by further input immediately.
 *    This includes forbidden emails and max length errors.
 * 2. Show errors that can be caused by incomplete user input on blur.
 *    This includes pattern and min length errors.
 * 3. Show required errors on submit. So far this is the only error design wants shown on submit.
 */
export type ErrorMatcher = (control: NgControl, form: FormGroupDirective) => ControlState | null;

interface ErrorMatches {
    onChange?: string[];
    onBlur?: string[];
    onSubmit?: string[];
}

@staticImplements<{ [P in ControlPresets]: ErrorMatches }>()
class NxPresetMatches {
    static requiredEmail = {
        onChange: ['maxlength'],
        onBlur: ['pattern'],
        onSubmit: ['required'],
    };
}

/** Factory to produce error matcher functions.
 *
 * At least one set of triggers is required. Multiple sets will be composed.
 */
export function errorMatcherFactory(
    trigger: ErrorMatches | `${ControlPresets}`,
    ...others: (ErrorMatches | `${ControlPresets}`)[]
): ErrorMatcher {
    const changeErrors: string[] = [];
    const blurErrors: string[] = [];
    const submitErrors: string[] = [];
    const triggers = [trigger].concat(others);
    for (const trigger of triggers) {
        const { onChange, onBlur, onSubmit } =
            typeof trigger === 'string' ? NxPresetMatches[trigger] : trigger;
        if (onChange) {
            changeErrors.push(...onChange);
        }
        if (onBlur) {
            blurErrors.push(...onBlur);
        }
        if (onSubmit) {
            submitErrors.push(...onSubmit);
        }
    }

    return (control, form) => {
        if (!control.invalid) {
            return null;
        }
        const errors = control.errors!;

        for (let i = 0; i < changeErrors.length; i++) {
            const key = changeErrors[i];
            const data = errors[key];
            if (data) {
                return { key, data };
            }
        }
        if (control.touched) {
            for (let i = 0; i < blurErrors.length; i++) {
                const key = blurErrors[i];
                const data = errors[key];
                if (data) {
                    return { key, data };
                }
            }
        }
        if (form.submitted) {
            for (let i = 0; i < submitErrors.length; i++) {
                const key = submitErrors[i];
                const data = errors[key];
                if (data) {
                    return { key, data };
                }
            }
        }

        /* Potential pitfall: forgetting to add the trigger for an error */
        if (!environment.production) {
            const notYetTouched = control.untouched && blurErrors.some(e => e in errors);
            const notYetSubmitted = !form.submitted && submitErrors.some(e => e in errors);
            if (!(notYetTouched || notYetSubmitted)) {
                console.warn('No matches found for errors', errors);
            }
        }
        return null;
    };
}

export const requiredErrorMatcher = errorMatcherFactory({ onSubmit: ['required'] });
