import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { CreateSystemGroup as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxSystemGroupsService } from '@pages/home/services/system-groups.service';
import { selectCurrentOrgId } from '@pages/home/store/channel-partners/channel-partners.selectors';
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

    newGroupName: string;
    // groupNames: string[];
    // parentOptions: GroupNameOption[];
    // selectedParent: GroupNameOption;

    targetId: string | undefined;
    parentGroup: string | undefined;
    hasGroups: boolean | undefined;

    createSystemGroupProcess: Process;

    constructor(
        private processService: NxProcessService,
        protected dialogRef: DialogRef<DT['return']>,
        private store: Store,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
        private groupsService: NxSystemGroupsService,
    ) {
        super(dialogRef);
        this.store
            .select(selectCurrentOrgId)
            .pipe(takeUntilDestroyed())
            .subscribe(orgId => {
                this.createSystemGroupProcess = this.processService.createProcess(
                    () => {
                        this.groupsService.createGroup(this.newGroupName, orgId, this.targetId);
                        return Promise.resolve();
                    },
                    {},
                    () => this.close(),
                );
            });
    }

    ngOnInit(): void {
        assignFrom(this.dialogData, ['targetId', 'parentGroup', 'hasGroups'], this);
    }
}
