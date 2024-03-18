import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject, WritableSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { NxOrgTreeSelectorComponent } from '@dialogs/channel-partners/org-tree-selector/org-tree-selector.component';
import { ModalBase } from '@dialogs/modal-base';
import { NxChannelPartnersService } from '@services/channel-partners.service';
import {
    GroupItem,
    Organization,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import { MoveOrgItem as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-move-org-item-content',
    templateUrl: 'move-org-item.component.html',
    standalone: true,
    imports: [
        NxOrgTreeSelectorComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        FormsModule,
        TranslateModule,
    ],
})
export class MoveOrgItemModalContent extends ModalBase<DT['return']> {
    moveOrgItemProcess: Process;

    organization: Organization;
    groups: GroupItem[];
    item: SystemItem | GroupItem;

    selectedFolder$$: WritableSignal<string>;

    constructor(
        private cpService: NxChannelPartnersService,
        private processService: NxProcessService,
        public override dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { organization, groups, item }: DT['data'],
    ) {
        super(dialogRef);
        this.organization = organization;
        this.groups = groups;
        this.item = item;

        this.selectedFolder$$ = signal(organization.id);

        this.moveOrgItemProcess = this.processService.createProcess(
            () => {
                let folder = this.selectedFolder$$();
                folder = folder === organization.id ? null : folder;

                if ('parentId' in item) {
                    return firstValueFrom(this.cpService.patchGroup(item.id, { parentId: folder }));
                } else {
                    return firstValueFrom(
                        this.cpService.updateSystemGroup(item.systemId, { groupId: folder }),
                    );
                }
            },
            {},
            res => this.close(res),
        );
    }
}
