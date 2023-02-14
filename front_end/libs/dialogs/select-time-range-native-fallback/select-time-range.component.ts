import { Component, Inject, Input, OnInit } from '@angular/core';
import dateFormat from 'dateformat';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { pickFrom } from '@utils/general';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

const DATE_FORMAT_STRING = 'yyyy-mm-dd';
const TIME_FORMAT_STRING = 'HH:MM:ss';

@Component({
    selector: 'nx-modal-select-time-range',
    templateUrl: 'select-time-range.component.html',
    styleUrls: ['select-time-range.component.scss'],
})
export class SelectTimeRangeModalContent implements OnInit {
    CONFIG: IConfig;
    LANG = staticLang;
    hideErrors = true;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;

    tweakedTStart: Date;
    tweakedTEnd: Date;

    selection: TimelineSelectionService;
    start: number;
    end: number;

    themeClass: string;
    tweakedTimelineStartDate: Date;
    tweakedTimelineEndDate: Date;
    timelineStart: string;
    timelineEnd: string;

    @Input() closable = true;

    constructor(
        configService: NxConfigService,
        private dialogRef: DialogRef,
        private vms: VideoManagementSystemService,
        private timeline: TimelineService,
        @Inject(DIALOG_DATA)
        private dialogData: {
            selection: TimelineSelectionService;
            start: Date;
            end: Date;
        },
    ) {
        pickFrom(this.dialogData, ['selection', 'start', 'end'], this);

        this.CONFIG = configService.getConfig();
        this.themeClass = this.CONFIG.isDarkTheme ? 'dark' : 'light';
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

    checkMaxMinDate() {
        const newStartDate = new Date(
            this.startDate + 'T' + this.startTime
        ).getTime();

        if (
            isNaN(newStartDate) ||
            newStartDate < this.tweakedTimelineStartDate.getTime() ||
            newStartDate > this.tweakedTimelineEndDate.getTime()
        ) {
            this.startDate = dateFormat(this.tweakedTimelineStartDate, DATE_FORMAT_STRING);
            this.startTime = dateFormat(this.tweakedTimelineStartDate, TIME_FORMAT_STRING);
        }

        const newEndDate = new Date(
            this.endDate + 'T' + this.endTime
        ).getTime();

        if (
            isNaN(newEndDate) ||
            newEndDate > this.tweakedTimelineEndDate.getTime()
        ) {
            this.endDate = dateFormat(this.tweakedTimelineEndDate, DATE_FORMAT_STRING);
            this.endTime = dateFormat(this.tweakedTimelineEndDate, TIME_FORMAT_STRING);
        }
    }

    private initSelectionDates(): void {
        this.tweakedTStart = new Date(
            this.vms.tweakT(this.selection.range.start)
        );
        this.tweakedTEnd = new Date(
            this.vms.tweakT(this.selection.range.end)
        );

        this.startDate = dateFormat(this.tweakedTStart, DATE_FORMAT_STRING);
        this.startTime = dateFormat(this.tweakedTStart, TIME_FORMAT_STRING);
        this.endDate = dateFormat(this.tweakedTEnd, DATE_FORMAT_STRING);
        this.endTime = dateFormat(this.tweakedTEnd, TIME_FORMAT_STRING);
    }

    private initTimelineDates(): void {
        this.tweakedTimelineStartDate = new Date(
            this.vms.tweakT(this.timeline.fullRange.start)
        );
        this.tweakedTimelineEndDate = new Date(
            this.vms.tweakT(this.timeline.fullRange.end)
        );

        this.timelineStart = dateFormat(this.tweakedTimelineStartDate, DATE_FORMAT_STRING);
        this.timelineEnd = dateFormat(this.tweakedTimelineEndDate, DATE_FORMAT_STRING);
    }

    ngOnInit(): void {
        this.initSelectionDates();
        this.initTimelineDates();
    }

    close = (msg: boolean | {}): void => {
        this.dialogRef.close(msg);
    };
}
