import { Component, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy }                from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxToastService }            from '../toast.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { ModalContent, ModalType } from '@pages/developer-console/console/table/console-table.component';
import { DataStructure, DataStructureType } from '@pages/developer-console/console/edit/console-edit.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-modal-edit',
    templateUrl : 'edit.component.html',
    styleUrls   : ['edit.component.scss']
})
export class EditModalContent implements ModalContent {
    @Input() id: number;
    @Input() heading: string;
    @Input() modal: ModalType;
    @Input() structures: DataStructure[];

    STRUCTURE_TYPE = DataStructureType
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    saveContext: Process;
    deleteContext: Process;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.config;
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.saveContext = this.processService.createProcess(() => {
            // TODO: Replace process with saving to CMS once endpoint is ready
            return new Promise(resolve => setTimeout(resolve, 2500));
        }, {}, result => {
            const options = {
                classname : this.CONFIG.toast.success,
                autohide  : true,
                delay     : this.CONFIG.alertTimeout
            };
            this.toastService.show('Context Saved', options);
            this.close();
        }, err => { console.error(err); });

        this.deleteContext = this.processService.createProcess(() => {
            // TODO: Replace process with saving to CMS once endpoint is ready
            return new Promise(resolve => setTimeout(resolve, 2500));
        }, {}, result => {
            const options = {
                classname : this.CONFIG.toast.success,
                autohide  : true,
                delay     : this.CONFIG.alertTimeout
            };
            this.toastService.show('Context Deleted', options);
            this.close();
        }, err => { console.error(err); });
    }

    close = () => {
        this.activeModal.close();
    }
}
