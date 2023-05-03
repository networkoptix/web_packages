import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { AddPartnerUser as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxToastService } from '@dialogs/toast.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-modal-add-partner-user-content',
    templateUrl: 'add-partner-user.component.html',
    styleUrls: [],
})
export class AddPartnerUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    public email: string;

    roles: DropdownItem<Id>[] = [];
    selectedRole: DropdownItem<Id>;

    createUserProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) partnerId: DT['data'],
        cpService: NxChannelPartnersService,
        processService: NxProcessService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        // There's probably a smarter place to put this so we only have
        // to fetch once, but putting here for now
        cpService.getChannelPartnerRoles().subscribe(roles => {
            this.roles = roles.map<DropdownItem<Id>>(role => ({
                name: role.name,
                value: role.id,
            }));
            this.selectedRole = this.roles[0];
        });

        this.createUserProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(cpService.createChannelPartnerUser(partnerId, { email: this.email, role: this.selectedRole.name }));
            },
            {},
            res => this.close(res),
            err => {
                this.unlock();
                console.error(err);
                const msg = err.error ? `${err.status} ${err.error.detail}` : err.detail || err;
                toastService.notify(msg, 'danger');
            }
        );
    }

    ngOnInit(): void {}
}
