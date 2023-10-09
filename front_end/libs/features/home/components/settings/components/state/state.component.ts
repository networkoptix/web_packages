import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import LANG from '@language_static';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@variables/static-variables';

@Component({
    selector: 'nx-settings-state',
    templateUrl: 'state.component.html',
    styleUrls: ['../../settings.component.scss', 'state.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        AngularSvgIconModule,
        MatButtonToggleModule,
        TranslateModule,
        NgxTranslateCutModule,
        LetDirective,
    ],
})
export class NxSettingsStateComponent {
    icons = icons;
    LANG = LANG;
    State = State;
    newState: State;
    @Input() canChange: boolean;
    @Input() currState: State;
    @Output() updateState = new EventEmitter<State>();

    constructor() {
        this.currState = State.Active;
        this.newState = this.currState;
    }
}
