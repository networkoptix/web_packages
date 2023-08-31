import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { AddChannelPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-modal-add-partner-content',
    templateUrl: 'add-partner.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class AddPartnerModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    name: string;

    addPartnerProcess: Process;

    /* Assuming no way to create top level partners for now, also assuming that
    create partner buttons will be all associated with a parent partner */
    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) parentChannelPartner: DT['data'],
        private cpService: NxChannelPartnersService,
        processService: NxProcessService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        this.addPartnerProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    this.cpService.createChannelPartner({
                        name: this.name,
                        parentChannelPartner,
                    }),
                );
            },
            {},
            res => this.close(res),
            err => {
                this.unlock();
                console.error(err);
                const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                toastService.notify(msg, ToastType.Danger);
            },
        );
    }

    ngOnInit(): void {}
}
