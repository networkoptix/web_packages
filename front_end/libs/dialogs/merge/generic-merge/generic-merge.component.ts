import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';

import { MergeState } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-generic-merge-component',
    templateUrl: 'generic-merge.component.html',
    styleUrls: ['generic-merge.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NgxTranslateCutModule,
        AngularSvgIconModule,
        PipesModule,
        NxProcessButtonComponent,
        NxAddSvgSrcDirective,
    ],
})
export class NxMergeGenericMergeComponent {
    LANG = staticLang;
    icons = icons;

    @Input() genericMergeProcess: Process;
    @Input() serverUrlErrorText: string;
    @Input() errorCode: string;
    @Input() thisSystemHasOutdatedServer: boolean;
    @Input() failedToFindAnySystem: boolean;
    @Output() close = new EventEmitter<void>();
    @Output() setCurrentState = new EventEmitter<MergeState>();
}
