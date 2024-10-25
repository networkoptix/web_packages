import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import staticLang from '@language_static';

import { MergeError } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-error',
    templateUrl: 'merge-error.component.html',
    styleUrls: ['merge-error.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, AngularSvgIconModule, NxProcessButtonComponent],
})
export class NxMergeMergeError {
    LANG = staticLang;
    error = input<MergeError>();
    primarySystemOffline = input<boolean>();
    secondarySystemOffline = input<boolean>();
    primaryName = input<string>();
    secondaryName = input<string>();
    finishDialog = output<boolean>();
}
