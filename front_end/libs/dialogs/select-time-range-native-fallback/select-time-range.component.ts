import { Component, Inject, Input } from '@angular/core';
import dateFormat from 'dateformat';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { pickFrom } from '@utils/general';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

const DATE_FORMAT_STRING = 'yyyy-MM-dd';
const TIME_FORMAT_STRING = 'HH:mm:ss';

@Component({
    selector: 'nx-modal-select-time-range',
    templateUrl: 'select-time-range.component.html',
    styleUrls: ['select-time-range.component.scss'],
})
export class SelectTimeRangeModalContent {
    LANG = staticLang;
    hideErrors = true;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;

    selection: TimelineSelectionService;

    @Input() closable = true;

    constructor(
        private dialogRef: DialogRef,
        private vms: VideoManagementSystemService,
        @Inject(DIALOG_DATA)
        private dialogData: {
            selection: TimelineSelectionService;
        },
    ) {
        pickFrom(this.dialogData, ['selection'], this);
    }

    public closeModal = $event => {
        $event.preventDefault();
        return this.close(false);
    };

    public save = $event => {
        $event.preventDefault();
        const nowTime = this.vms.tweakT(new Date().getTime());
        const startTime = new Date(
            this.startDate + 'T' + this.startTime,
        ).getTime();
        const endTime = new Date(this.endDate + 'T' + this.endTime).getTime();

        const start = this.vms.untweakT(Math.min(nowTime, startTime));
        const end = this.vms.untweakT(Math.min(nowTime, endTime));

        if (start > end) {
            return this.close({ start: end, end: start });
        } else {
            return this.close({ start, end });
        }
    };

    ngOnInit(): void {
        const tweakedTStart = new Date(
            this.vms.tweakT(this.selection.range.start),
        );
        const tweakedTEnd = new Date(this.vms.tweakT(this.selection.range.end));

        this.startDate = dateFormat(tweakedTStart, DATE_FORMAT_STRING);
        this.startTime = dateFormat(tweakedTStart, TIME_FORMAT_STRING);
        this.endDate = dateFormat(tweakedTEnd, DATE_FORMAT_STRING);
        this.endTime = dateFormat(tweakedTEnd, TIME_FORMAT_STRING);
    }

    close = (msg: boolean | {}): void => {
        this.dialogRef.close(msg);
    };
}
