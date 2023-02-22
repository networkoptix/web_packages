import { Component, OnInit, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import { DialogRef } from '@dialogs/dialog-ref';
import { NxSystemGroupsService } from '@pages/systems/groups/services/system-groups.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-modal-system-group-settings-content',
    templateUrl: 'system-group-settings.component.html',
    styleUrls: [],
})
export class SystemGroupSettingsModalContent implements OnInit {
    @ViewChild('systemGroupSettingsForm') form: NgForm;

    systemGroupSettingsProcess: Process;
    code = '';

    constructor(
        private processService: NxProcessService,
        private systemGroupsService: NxSystemGroupsService,
        public dialogRef: DialogRef,
        // @Inject(DIALOG_DATA) private dialogData: never,
    ) {}

    private _importGroups(code: string): void {
        this.systemGroupsService.import(code);
    }

    ngOnInit(): void {
        this.code = this.systemGroupsService.export();
        const successHandler = (): void => {
            this.dialogRef.close();
        };
        this.systemGroupSettingsProcess = this.processService.createProcess(() => {
            this._importGroups(this.code);
            return Promise.resolve();
        }, {}, successHandler);
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
