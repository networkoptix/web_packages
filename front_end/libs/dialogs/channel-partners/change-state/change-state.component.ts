import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { ChangeCpState as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import LANG from '@language_static';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { icons } from '@variables/static-variables';

@Component({
    selector: 'nx-change-state',
    templateUrl: 'change-state.component.html',
    styleUrls: ['change-state.component.scss'],
    encapsulation: ViewEncapsulation.None, // Needed to style inside CDK components
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NgxTranslateCutModule,
        MatButtonToggleModule,
        LetDirective,
        AngularSvgIconModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxChangeStateModalContent extends ModalBase<DT['return']> implements OnInit {
    icons = icons;
    LANG = LANG;
    changeStateProcess: Process;
    State = State;
    newState: State;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { currentState, update }: DT['data'],
        processService: NxProcessService,
    ) {
        super(dialogRef);
        this.newState = currentState;
        this.changeStateProcess = processService.createProcess(
            () => {
                return firstValueFrom(update(this.newState));
            },
            {},
            () => {
                this.close(this.newState);
            },
            () => {},
        );
    }

    ngOnInit(): void {}
}
