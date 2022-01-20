import { formatDate } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import {
    TimelineSelectionService
} from '../../pages/systems/view/vms-client/submodules/timeline/services/timeline.selection.service';

interface DateDict {
    date?: Date,

    year: number
    month: number
    day: number
    hour: number
    minute: number
}

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

    start: DateDict
    end: DateDict

    private _dateFromDateDict (d: DateDict): Date {
        const str = `${d.year}-${d.month.toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}` +
            'T' +
            `${d.hour.toString().padStart(2, '0')}:${d.minute.toString().padStart(2, '0')}`;
        return new Date(str);
    }

    private _dateDictFromTimeStamp (ts: number): DateDict {
        const date = new Date(ts);
        return {
            date,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
        };
    }

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

    public handleChange (v: string, a: 'start' | 'end', b: 'year' | 'month' | 'day' | 'hour' | 'minute') {
        this[a][b] = parseInt(v) || 1;
        switch (a) {
            case 'start':
                this.start.date = this._dateFromDateDict(this.start);
                break;
            case 'end':
                this.end.date = this._dateFromDateDict(this.end);
                break;
        }
    }

    public save = ($event) => {
        $event.preventDefault();
        const start = this.start.date.getTime();
        const end = this.end.date.getTime();
        if (start > end) {
            return this.activeModal.close({ start: end, end: start });
        } else {
            return this.activeModal.close({ start, end });
        }
    }

    ngOnInit() {
        this.start = this._dateDictFromTimeStamp(this.selection.range.start);
        this.end = this._dateDictFromTimeStamp(this.selection.range.end);
    }
}

export default SelectTimeRangeModalContent;
