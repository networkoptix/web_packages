import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxRadioComponent } from '@components/radio/radio.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { NxSystem } from '@services/system.service/system';
import { icons } from '@static-variables';

import { MergeState, MergeSystem } from '../merge.refactor.component.types';

@Component({
    selector: 'nx-merge-choose-primary-component',
    templateUrl: 'choose-primary.component.html',
    styleUrls: ['choose-primary.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        NxRadioComponent,
        NxAddSvgSrcDirective,
    ],
})
export class NxMergeChoosePrimaryComponent implements OnInit {
    LANG = staticLang;
    icons = icons;
    readonly MergeState = MergeState;

    @Input() system: NxSystem;
    @Input() targetSystem: MergeSystem;
    @Input() errorCode: string;
    @Output() currentSystemIsPrimaryChange = new EventEmitter<boolean>();
    @Output() setCurrentState = new EventEmitter<MergeState>();

    primarySystemId: string;

    isCurrentSystemPrimary(): void {
        this.currentSystemIsPrimaryChange.emit(this.system.id !== this.primarySystemId);
    }

    ngOnInit(): void {
        this.primarySystemId = this.system.id;
    }
}
