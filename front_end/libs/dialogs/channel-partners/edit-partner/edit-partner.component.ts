import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { EditChannelPartner as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import LANG from '@language_static';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-edit-partner',
    templateUrl: 'edit-partner.component.html',
    styleUrls: ['edit-partner.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxGenericDropdownModule,
        NxCheckboxComponent,
        NxNumericComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxEditPartnerModalContent extends ModalBase<DT['return']> implements OnInit {
    states: DropdownItem<State>[];
    state: DropdownItem<State>;
    parentPartners: DropdownItem<string>[] = [];
    selectedParent: DropdownItem<string>;
    name: string;
    canCreateSubChannels: boolean;
    hasMonthlyLimit: boolean;
    monthlyAdditionalServiceLimit: number = 0;

    editPartnerProcess: Process;

    readonly POSITIVE_INFINITY = Number.POSITIVE_INFINITY;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA)
        { state, parentChannelPartner, name, id, monthlyAdditionalServiceLimit }: DT['data'],
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
            this.parentPartners = partners.map<DropdownItem<string>>(p => ({
                name: p.name,
                value: p.id,
                help: LANG.systemGroups.status[p.state],
            }));
            this.selectedParent = this.parentPartners.find(p => p.value === parentChannelPartner);
        });
        this.name = name;
        if (monthlyAdditionalServiceLimit === null) {
            this.hasMonthlyLimit = false;
        } else {
            this.hasMonthlyLimit = true;
            this.monthlyAdditionalServiceLimit = monthlyAdditionalServiceLimit;
        }

        this.editPartnerProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.updateChannelPartner(id, {
                        state: this.state.value,
                        // parentChannelPartner: this.selectedParent.value,
                        name: this.name,
                        canCreateSubChannels: this.canCreateSubChannels,
                        // monthlyAdditionalServiceLimit: this.hasMonthlyLimit
                        //     ? this.monthlyAdditionalServiceLimit
                        //     : null,
                        /* Can't unset monthly limit to null once set to a numbe atm */
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
