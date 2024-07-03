import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { PatchGroup } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import type { UpdateSystemGroup as DT } from '../../dialogs.types';

const FIELDS_MISSING = 'FIELDS_MISSING';

@Component({
    selector: 'nx-modal-update-system-group-content',
    templateUrl: 'update-system-group.component.html',
    styleUrl: 'update-system-group.component.scss',
    standalone: true,
    imports: [
        FormsModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        TranslateModule,
    ],
})
export class UpdateSystemGroupModalContent extends ModalBase<DT['return']> {
    name: string = '';
    updateSystemGroupProcess: Process;

    @ViewChild('updateSystemGroupFrom') form: NgForm;

    constructor(
        private processService: NxProcessService,
        private cpService: NxChannelPartnersService,
        public override dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private groupId: DT['data'],
    ) {
        super(dialogRef);
        this.updateSystemGroupProcess = this.processService.createProcess(
            () => {
                if (!this.name) {
                    return Promise.reject({ status: FIELDS_MISSING });
                }
                const data: PatchGroup = {
                    name: this.name,
                };
                return firstValueFrom(this.cpService.patchGroup(this.groupId, data));
            },
            { ignoreError: true },
            res => this.close(res),
            err => {
                if (err.status === FIELDS_MISSING) {
                    this.form.form.markAllAsTouched();
                }
            },
        );
    }
}
