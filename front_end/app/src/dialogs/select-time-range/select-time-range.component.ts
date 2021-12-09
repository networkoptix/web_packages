import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import {
    TimelineSelectionService
} from '../../pages/systems/view/vms-client/submodules/timeline/services/timeline.selection.service';

@Component({
    selector: 'nx-modal-select-time-range',
    templateUrl: 'select-time-range.component.html',
    styleUrls: ['select-time-range.component.scss']
})
export class SelectTimeRangeModalContent {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    hideErrors = true;
    @Input() closable;

    start: Date;
    end: Date;

    constructor(
        public activeModal: NgbActiveModal,
        private language: NxLanguageProviderService,
        private configService: NxConfigService,
        private selection: TimelineSelectionService
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.translations;
    }

    public closeModal = ($event) => {
        $event.preventDefault();
        return this.activeModal.close(false);
    }

    public handleDateTimeChanged (eventDate: string): Date | null {
        return eventDate ? new Date(eventDate) : null;
    }

    public save = ($event) => {
        $event.preventDefault();
        const start = this.start.getTime();
        const end = this.end.getTime();
        if (start > end) {
            return this.activeModal.close({ start: end, end: start });
        } else {
            return this.activeModal.close({ start, end });
        }
    }

    ngOnInit() {
        this.start = new Date(this.selection.range.start);
        this.end = new Date(this.selection.range.end);
    }

    public activeTab: string = 'start'

    public activateTab (name: 'start' | 'end') {
        this.activeTab = name;
    }
}

export default SelectTimeRangeModalContent;
