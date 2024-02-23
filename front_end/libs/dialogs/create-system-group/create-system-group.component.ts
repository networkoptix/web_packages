import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { CreateSystemGroup as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxChannelPartnersService } from '@pages/home/services/channel-partners.service';
import { CreateGroup } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { assignFrom } from '@utils/general';

// type GroupNameOption = DropdownItem<string>;

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: ['create-system-group.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        TranslateModule,
    ],
})
export class CreateSystemGroupModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    @ViewChild('createSystemGroupForm') form: NgForm;

    name: string;
    hasGroups: boolean;
    parentGroup: string | undefined;
    orgId: string | undefined;

    createSystemGroupProcess: Process;

    constructor(
        private processService: NxProcessService,
        protected dialogRef: DialogRef<DT['return']>,
        private cpService: NxChannelPartnersService,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.createSystemGroupProcess = this.processService.createProcess(
            () => {
                const data: CreateGroup = {
                    name: this.name,
                    parentId: this.parentGroup ?? null,
                    organizationId: this.orgId,
                };
                return firstValueFrom(this.cpService.createGroup(data));
            },
            {},
            res => this.close(res),
        );
    }

    ngOnInit(): void {
        assignFrom(this.dialogData, ['hasGroups', 'parentGroup', 'orgId'], this);
    }
}
