import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { EditPartnerUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-edit-partner-user',
    templateUrl: 'edit-partner-user.component.html',
    styleUrls: ['edit-partner-user.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxGenericDropdownModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxEditPartnerUserModalContent extends ModalBase<DT['return']> implements OnInit {
    roles: DropdownItem<Id>[] = [];
    role: DropdownItem<Id>;

    editPartnerUserProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA)
        {
            channelPartner,
            user: {
                email,
                roles: [role],
            },
        }: DT['data'],
        processService: NxProcessService,
        cpService: NxChannelPartnersService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        cpService.getChannelPartnerRoles().subscribe(roles => {
            this.roles = roles.map<DropdownItem<Id>>(r => ({
                name: r.name,
                value: r.id,
            }));
            this.role = this.roles.find(r => r.name === role);
        });
        this.editPartnerUserProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.updateChannelPartnerUser(channelPartner, {
                        email,
                        role: this.role.name,
                    }),
                );
            },
            {},
            this.close,
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
