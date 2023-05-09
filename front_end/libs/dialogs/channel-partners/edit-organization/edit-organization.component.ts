import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import LANG from '@common/language/language_i18n_static.json';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { EditOrganization as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxToastService } from '@dialogs/toast.service';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-edit-organization',
    templateUrl: 'edit-organization.component.html',
    styleUrls: ['edit-organization.component.scss'],
})
export class NxEditOrganizationModalContent extends ModalBase<DT['return']> implements OnInit {
    states: DropdownItem<State>[];
    state: DropdownItem<State>;
    channelPartners: DropdownItem<Id>[] = [];
    selectedPartner: DropdownItem<Id>;
    channelPartnerCanAdminister: boolean;
    name: string;

    editOrgProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) {
            state,
            channelPartner,
            channelPartnerCanAdminister,
            name,
            id,
        }: DT['data'],
        processService: NxProcessService,
        cpService: NxChannelPartnersService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        this.states = Object.values(State).map(v => ({
            name: LANG.systemGroups.status[v],
            value: v,
        }));
        this.state = this.states.find(s => s.value === state);
        cpService.getChannelPartners().subscribe(partners => {
            this.channelPartners = partners.map<DropdownItem<Id>>(p => ({
                name: p.name,
                value: p.id,
                help: LANG.systemGroups.status[p.state],
            }));
            this.selectedPartner = this.channelPartners.find(
                p => p.value === channelPartner
            );
        });
        this.channelPartnerCanAdminister = channelPartnerCanAdminister;
        this.name = name;

        this.editOrgProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(cpService.updateOrganization(id, {
                    state: this.state.value,
                    channelPartner: this.selectedPartner.value,
                    channelPartnerCanAdminister: this.channelPartnerCanAdminister,
                    name: this.name,
                }));
            },
            {},
            this.close,
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
