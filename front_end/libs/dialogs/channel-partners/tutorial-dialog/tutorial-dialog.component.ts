import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { RouterLink } from '@angular/router';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { AddSystemTutorial as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { ConnectionStatus } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

@Component({
    selector: 'nx-tutorial-dialog',
    templateUrl: 'tutorial-dialog.component.html',
    styleUrls: ['tutorial-dialog.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        TranslateModule,
        LetDirective,
        MatButtonToggle,
        MatButtonToggleGroup,
        NgxTranslateCutModule,
        NxContentBlockSectionComponent,
        RouterLink,
    ],
})
export class NxTutorialDialogComponent extends ModalBase<DT['return']> {
    LANG = staticLang;
    ConnectionStatus = ConnectionStatus;
    systemStatus: ConnectionStatus = ConnectionStatus.NotConnected;

    constructor(dialogRef: DialogRef<DT['return']>, dialog: NxDialogsService) {
        super(dialogRef);
    }

    toggleState(status: ConnectionStatus): void {
        this.systemStatus = status;
    }
}
