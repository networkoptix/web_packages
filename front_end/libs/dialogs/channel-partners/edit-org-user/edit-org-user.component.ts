import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { ToastType } from '@components/toast-container/toast.types';
import type { EditOrgUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-edit-org-user',
    templateUrl: 'edit-org-user.component.html',
    styleUrls: ['edit-org-user.component.scss'],
})
export class NxEditOrgUserModalContent extends ModalBase<DT['return']> implements OnInit {
    roles: DropdownItem<Id>[] = [];
    role: DropdownItem<Id>;
    editOrgUserProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { orgId, user: { email, roles: [role] } }: DT['data'],
        processService: NxProcessService,
        cpService: NxChannelPartnersService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        cpService.getOrganizationRoles().subscribe(roles => {
            this.roles = roles.map<DropdownItem<Id>>(r => ({
                name: r.name,
                value: r.id,
            }));
            this.role = this.roles.find(r => r.name === role);
        });
        this.editOrgUserProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.updateOrganizationUser(orgId, {
                        email,
                        role: this.role.name
                    })
                );
            },
            {},
            this.close,
            err => {
                this.unlock();
                console.error(err);
                const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                toastService.notify(msg, ToastType.Danger);
            }
        );
    }

    ngOnInit(): void {}
}
