import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

import { v4 as uuid } from 'uuid';

@Component({
    selector: 'nx-modal-create-system-group-content',
    templateUrl: 'create-system-group.component.html',
    styleUrls: []
})
export class CreateSystemGroupModalContent implements OnInit {
    @Input() closable: boolean;
    @ViewChild('addSystemGroupForm') form;

    createSystemGroupProcess: Process;
    group = {
        name: ''
    };

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
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
        const successHandler = (group) => {
            return this.activeModal.close(group);
        };
        this.createSystemGroupProcess = this.processService.createProcess(() => {
            return this._createGroup(this.group.name);
        }, {}, successHandler);
    }
}
