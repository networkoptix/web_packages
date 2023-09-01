import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { FormsModule, type NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import type { MergeState, MergeSystem } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-admin-password-component',
    templateUrl: 'admin-password.component.html',
    styleUrls: ['admin-password.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        NxProcessButtonComponent,
        NxAddSvgSrcDirective,
    ],
})
export class NxMergeAdminPasswordComponent implements OnChanges {
    LANG = staticLang;
    icons = icons;

    @Input() adminPasswordProcess: Process;
    @Input() password: string;
    @Input() targetSystem: MergeSystem;
    @Input() errorCode: string;
    @Input() isSessionOauth: boolean;
    @Output() passwordChange = new EventEmitter<string>();
    @Output() setCurrentState = new EventEmitter<MergeState>();

    @ViewChild('adminPasswordForm', { static: false }) adminPasswordForm: NgForm;
    header: string;

    ngOnChanges(changes: NgChanges<NxMergeAdminPasswordComponent>): void {
        if (changes.errorCode?.currentValue) {
            if (changes.errorCode.currentValue === 'wrongPassword') {
                this.adminPasswordForm.form.controls.adminPassword.setErrors({
                    wrongPassword: true,
                });
            }
        }
    }
}
