import { Component, Inject, OnInit, ViewChild } from '@angular/core';

import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxProcessService, Process } from '@services/process.service';

import { NxSystemGroupsService } from '../../pages/systems/groups/services/system-groups.service';

@Component({
    selector: 'nx-modal-system-group-settings-content',
    templateUrl: 'system-group-settings.component.html',
    styleUrls: []
})
export class SystemGroupSettingsModalContent implements OnInit {
    @ViewChild('systemGroupSettingsForm') form;

    systemGroupSettingsProcess: Process;
    code = '';

    constructor(
        private processService: NxProcessService,
        private systemGroupsService: NxSystemGroupsService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
    }

    private _importGroups(code) {
        return this.systemGroupsService.importBase64(code);
    }

    ngOnInit() {
        this.systemGroupsService.exportBase64().then(code => {
            this.code = code;
        });
        const successHandler = group => {
            return this.dialogRef.close(group);
        };
        this.systemGroupSettingsProcess = this.processService.createProcess(() => {
            return this._importGroups(this.code);
        }, {}, successHandler);
    }

    close = () => {
        this.dialogRef.close();
    };
}
