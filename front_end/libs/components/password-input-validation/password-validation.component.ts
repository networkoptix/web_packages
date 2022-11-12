import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
} from '@angular/core';
import { NgModel } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
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

    LANG: LanguageI18NStaticTypes;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;

    constructor(
        languageService: NxLanguageProviderService
    ) {
        this.LANG = languageService.translations;
    }

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
