import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import type { AddChannelPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxToastService } from '@dialogs/toast.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-modal-add-organization-content',
    templateUrl: 'add-organization.component.html',
    styleUrls: [],
})
export class AddOrganizationModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    name: string;

    addOrganizationProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) channelPartner: DT['data'],
        private cpService: NxChannelPartnersService,
        processService: NxProcessService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        this.addOrganizationProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(this.cpService.createOrganization({
                    name: this.name,
                    channelPartner
                }));
            },
            {},
            res => this.close(res),
            err => {
                this.unlock();
                console.error(err);
                const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                toastService.notify(msg, 'danger');
            },
        );
    }

    ngOnInit(): void {}
}
