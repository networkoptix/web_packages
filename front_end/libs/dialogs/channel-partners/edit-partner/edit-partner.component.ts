import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, OnInit, Inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import LANG from '@common/language/language_i18n_static.json';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { ToastType } from '@components/toast-container/toast.types';
import type { EditChannelPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { State, Id } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-edit-partner',
    templateUrl: 'edit-partner.component.html',
    styleUrls: ['edit-partner.component.scss'],
})
export class NxEditPartnerModalContent extends ModalBase<DT['return']> implements OnInit {
    states: DropdownItem<State>[];
    state: DropdownItem<State>;
    parentPartners: DropdownItem<Id>[] = [];
    selectedParent: DropdownItem<Id>;
    name: string;

    editPartnerProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { state, parentChannelPartner, name, id }: DT['data'],
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
            this.parentPartners = partners.map<DropdownItem<Id>>(p => ({
                name: p.name,
                value: p.id,
                help: LANG.systemGroups.status[p.state],
            }));
            this.selectedParent = this.parentPartners.find(
                p => p.value === parentChannelPartner
            );
        });
        this.name = name;

        this.editPartnerProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(cpService.updateChannelPartner(id, {
                    state: this.state.value,
                    parentChannelPartner: this.selectedParent.value,
                    name: this.name,
                }));
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
