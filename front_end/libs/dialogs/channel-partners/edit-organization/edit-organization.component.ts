import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, OnInit, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import LANG from '@common/language/language_i18n_static.json';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { EditOrganization as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { State } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-edit-organization',
    templateUrl: 'edit-organization.component.html',
    styleUrls: ['edit-organization.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxGenericDropdownModule,
        NxCheckboxComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxEditOrganizationModalContent extends ModalBase<DT['return']> implements OnInit {
    states: DropdownItem<State>[];
    state: DropdownItem<State>;
    channelPartners: DropdownItem<string>[] = [];
    selectedPartner: DropdownItem<string>;
    channelPartnerCanAdminister: boolean;
    name: string;

    editOrgProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA)
        { state, channelPartner, channelPartnerCanAdminister, name, id }: DT['data'],
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
            this.channelPartners = partners.map<DropdownItem<string>>(p => ({
                name: p.name,
                value: p.id,
                help: LANG.systemGroups.status[p.state],
            }));
            this.selectedPartner = this.channelPartners.find(p => p.value === channelPartner);
        });
        this.channelPartnerCanAdminister = channelPartnerCanAdminister;
        this.name = name;

        this.editOrgProcess = processService.createProcess(
            () => {
                this.lock();
                return firstValueFrom(
                    cpService.updateOrganization(id, {
                        state: this.state.value,
                        channelPartner: this.selectedPartner.value,
                        channelPartnerCanAdminister: this.channelPartnerCanAdminister,
                        name: this.name,
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
