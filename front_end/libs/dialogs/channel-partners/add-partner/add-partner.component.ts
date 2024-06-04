import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxEmailComponent } from '@components/email-input/email.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { AddChannelPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { MAX_NAME_LENGTH } from '@static-variables';

const FIELDS_MISSING = 'FIELDS_MISSING';

@Component({
    selector: 'nx-modal-add-partner-content',
    templateUrl: 'add-partner.component.html',
    styleUrls: ['add-partner.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxEmailComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class AddPartnerModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    name: string = '';
    firstAdminEmail: string = '';
    @ViewChild('addPartnerForm') private form: NgForm;

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
                if (!this.name || !this.firstAdminEmail) {
                    return Promise.reject({ status: FIELDS_MISSING });
                }
                return firstValueFrom(
                    this.cpService.createChannelPartner({
                        name: this.name,
                        parentChannelPartner,
                        firstAdminEmail: this.firstAdminEmail,
                    }),
                );
            },
            { ignoreError: true },
            res => this.close(res),
            err => {
                this.unlock();
                if (err.status === FIELDS_MISSING) {
                    this.form.form.markAllAsTouched();
                    return;
                }
                console.error(err);
                const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                toastService.notify(msg, ToastType.Danger);
            },
        );
    }

    onNameChange(value: string): void {
        const { partnerName } = this.form?.controls;

        if (value.length > MAX_NAME_LENGTH) {
            partnerName.setErrors({ tooLong: true });
            partnerName.markAsTouched();
            partnerName.markAsDirty();
        } else {
            partnerName.setErrors(null);
        }
    }
    ngOnInit(): void {}

    protected readonly MAX_NAME_LENGTH = MAX_NAME_LENGTH;
}
