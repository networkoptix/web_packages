import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import type { Confirm as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-modal-generic-content',
    templateUrl: 'generic.component.html',
    styleUrls: ['generic.component.scss'],
    standalone: true,
    imports: [CommonModule, PipesModule, NxAddSvgSrcDirective, AngularSvgIconModule],
})
export class GenericModalContent extends ModalBase<DT['return']> {
    icons = icons;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public dialogData: DT['data'],
    ) {
        super(dialogRef);
        dialogRef.disableClose = dialogData.disableClose;
    }
}
