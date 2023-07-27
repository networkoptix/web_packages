import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges, ViewChild } from '@angular/core';
import { FormsModule, type NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import staticLang from '@common/language/language_i18n_static.json';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { DirectivesModule } from '@directives/directives.module';
import { icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import { MergeState } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-confirm-merge-component',
    templateUrl: 'confirm-merge.component.html',
    styleUrls: ['confirm-merge.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NgxTranslateCutModule,
        AngularSvgIconModule,
        NxProcessButtonComponent,
        DirectivesModule,
    ],
})
export class NxMergeConfirmMergeComponent implements OnChanges {
    LANG = staticLang;
    icons = icons;

    @Input() confirmMergeProcess: Process;
    @Input() primaryName: string;
    @Input() secondaryName: string;
    @Input() maxServers: number;
    @Input() supportLink: string;
    @Input() password: string;
    @Input() errorCode: string;
    @Input() tooManyServers: boolean = false;
    @Input() isSessionOauth: boolean = false;
    @Input() isLocal: boolean;
    @Output() passwordChange = new EventEmitter<string>();
    @Output() setCurrentState = new EventEmitter<MergeState>();

    @ViewChild('confirmMergeForm', { static: false }) confirmMergeForm: NgForm;
    header: string;

    ngOnChanges(changes: NgChanges<NxMergeConfirmMergeComponent>): void {
        if (changes.errorCode?.currentValue) {
            const code = changes.errorCode.currentValue;
            this.confirmMergeForm.form.controls.cloudOwnerPassword.setErrors({ [code]: true });
        }
    }
}
