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
import { NxAccountService } from '@services/account.service';
import { OrgRoleIds } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-modal-add-organization-content',
    templateUrl: 'add-organization.component.html',
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
export class AddOrganizationModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    name: string;

    addOrganizationProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) channelPartner: DT['data'],
        private cpService: NxChannelPartnersService,
        private accountService: NxAccountService,
        processService: NxProcessService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        this.addOrganizationProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    this.cpService.createOrganization({
                        name: this.name,
                        channelPartner,
                    }),
                );
            },
            {},
            res => {
                this.cpService
                    .createOrganizationUser(res.id, {
                        email: this.accountService.email,
                        roleId: OrgRoleIds.OrgAdmin,
                    })
                    .subscribe();
                this.close(res);
            },
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
