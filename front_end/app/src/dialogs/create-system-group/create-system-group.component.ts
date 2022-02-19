import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { v4 as uuid } from 'uuid';

import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: []
})
export class CreateSystemGroupModalContent implements OnInit {
    @ViewChild('addSystemGroupForm') form;

    createSystemGroupProcess: Process;
    group = {
        name: ''
    };

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        public dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
    }

    private _createGroup(name) {
        return Promise.resolve({
            name,
            groups: [],
            systems: [],
            id: uuid(),
            type: 'group'
        });
    }

    ngOnInit() {
        const successHandler = group => {
            return this.dialogRef.close(group);
        };
        this.createSystemGroupProcess = this.processService.createProcess(() => {
            return this._createGroup(this.group.name);
        }, {}, successHandler);
    }

    close = () => {
        this.dialogRef.close();
    }
}
