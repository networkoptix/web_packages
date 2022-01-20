import { formatDate } from '@angular/common';
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

    startDate: string
    startTime: string
    endDate: string
    endTime: string

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

    public handleChange (v: string, a: 'start' | 'end', b: 'Date' | 'Time') {
        this[a + b] = v;
        switch (a) {
            case 'start':
                this.start = new Date(this.startDate + 'T' + this.startTime);
                break;
            case 'end':
                this.end = new Date(this.endDate + 'T' + this.endTime);
                break;
        }
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
        this.start = new Date(this.selection.range.start - this._timezoneOffset);
        this.end = new Date(this.selection.range.end - this._timezoneOffset);

        this.startDate = this.start.toISOString().slice(0, 10);
        this.startTime = this.start.toISOString().slice(11, 19);

        this.endDate = this.end.toISOString().slice(0, 10);
        this.endTime = this.end.toISOString().slice(11, 19);
    }

    private get _timezoneOffset () {
        return new Date().getTimezoneOffset() * 60 * 1000;
    }
}

export default SelectTimeRangeModalContent;
