import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
} from '@angular/core';
import { NgModel } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-password-input-validation',
    templateUrl: 'password-validation.component.html',
    styleUrls: ['password-validation.component.scss']
})
export class NxPasswordValidationComponent implements OnChanges {
    @Input() forElement: NgModel;
    @Input() value: string;
    @Input() customClass: string;
    @Input() hideErrors: boolean = false;
    @Output() updateWeakPassword = new EventEmitter<boolean>();

    LANG = staticLang;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;

    ngOnChanges(changes: NgChanges<NxPasswordValidationComponent>): void {
        if (changes.value) {
            this.weak = (
                this.forElement.errors &&
                this.forElement.errors.minlength &&
                !this.forElement.errors.pattern
            );
            this.updateWeakPassword.emit(this.weak);
        }
    }
}
