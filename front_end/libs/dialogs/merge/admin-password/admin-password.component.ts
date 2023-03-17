import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    ViewChild,
} from '@angular/core';
import type { NgForm } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { MergeStateType, MergeSystem } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-admin-password-component',
    templateUrl: 'admin-password.component.html',
    styleUrls: ['admin-password.component.scss']
})
export class NxMergeAdminPasswordComponent implements OnChanges {
    LANG = staticLang;
    icons = icons;

    @Input() adminPasswordProcess: Process;
    @Input() password: string;
    @Output() passwordChange = new EventEmitter<string>();
    @Input() targetSystem: MergeSystem;
    @IBool() @Input() isSessionOauth: CoercedBoolInput;
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<MergeStateType>();

    @ViewChild('adminPasswordForm', { static: false }) adminPasswordForm: NgForm;
    header: string;

    ngOnChanges(changes: NgChanges<NxMergeAdminPasswordComponent>): void {
        if (changes.errorCode?.currentValue) {
            if (changes.errorCode.currentValue === 'wrongPassword') {
                this.adminPasswordForm.form.controls.adminPassword.setErrors({ wrongPassword: true });
            }
        }
    }
}
