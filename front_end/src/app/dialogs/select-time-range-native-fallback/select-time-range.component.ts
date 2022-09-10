import { DatePipe } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';

import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';
import { pickFrom } from '@utils/general';
import {
    TimelineSelectionService
} from '@vms-client/submodules/timeline/services/timeline.selection.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

const DATE_FORMAT_STRING = 'yyyy-MM-dd';
const TIME_FORMAT_STRING = 'HH:mm:ss';

@Component({
    selector: 'nx-modal-select-time-range',
    templateUrl: 'select-time-range.component.html',
    styleUrls: ['select-time-range.component.scss']
})
export class SelectTimeRangeModalContent {
    LANG: LanguageI18NStaticTypes;
    hideErrors = true;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;

    selection: TimelineSelectionService;

    @Input() closable = true;

    constructor(
        private language: NxLanguageProviderService,
        private dialogRef: DialogRef,
        private vms: VideoManagementSystemService,
        private datepipe: DatePipe,
        @Inject(DIALOG_DATA) private dialogData: {
            selection: TimelineSelectionService,
        },
    ) {
        this.LANG = this.language.translations;

        pickFrom(this.dialogData, ['selection'], this);
    }

    public closeModal = $event => {
        $event.preventDefault();
        return this.close(false);
    };

    public save = $event => {
        $event.preventDefault();
        const start = this.vms.untweakT(new Date(this.startDate + 'T' + this.startTime).getTime());
        const end = this.vms.untweakT(new Date(this.endDate + 'T' + this.endTime).getTime());
        if (start > end) {
            return this.close({ start: end, end: start });
        } else {
            return this.close({ start, end });
        }
    };

    ngOnInit(): void {
        const tweakedTStart = new Date(this.vms.tweakT(this.selection.range.start));
        const tweakedTEnd = new Date(this.vms.tweakT(this.selection.range.end));

        this.startDate = this.datepipe.transform(tweakedTStart, DATE_FORMAT_STRING);
        this.startTime = this.datepipe.transform(tweakedTStart, TIME_FORMAT_STRING);
        this.endDate = this.datepipe.transform(tweakedTEnd, DATE_FORMAT_STRING);
        this.endTime = this.datepipe.transform(tweakedTEnd, TIME_FORMAT_STRING);
    }

    close = (msg: boolean | {}): void => {
        this.dialogRef.close(msg);
    };
}
