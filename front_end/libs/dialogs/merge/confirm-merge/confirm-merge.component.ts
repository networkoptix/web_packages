import { Component, EventEmitter, Input, Output, OnChanges, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { MergeStateType } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-confirm-merge-component',
    templateUrl: 'confirm-merge.component.html',
    styleUrls: ['confirm-merge.component.scss'],
})
export class NxMergeConfirmMergeComponent implements OnChanges {
    LANG = staticLang;
    icons = icons;

    @Input() confirmMergeProcess: Process;
    @Input() primaryName: string;
    @Input() secondaryName: string;
    @IBool() @Input() tooManyServers: CoercedBoolInput = false;
    @Input() maxServers: number;
    @Input() supportLink: string;
    @IBool() @Input() isLocal: CoercedBoolInput;
    @IBool() @Input() isSessionOauth: CoercedBoolInput = false;
    @Input() password: string;
    @Output() passwordChange = new EventEmitter<string>();
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<MergeStateType>();

    @ViewChild('confirmMergeForm', { static: false }) confirmMergeForm: NgForm;
    header: string;

    ngOnChanges(changes: NgChanges<NxMergeConfirmMergeComponent>): void {
        if (changes.errorCode?.currentValue) {
            const code = changes.errorCode.currentValue;
            this.confirmMergeForm.form.controls.cloudOwnerPassword.setErrors({ [code]: true });
        }
    }
}
