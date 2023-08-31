import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import dateFormat from 'dateformat';

import type { WebGlSelectTimeRange as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

const DATE_FORMAT_STRING = 'yyyy-mm-dd';
const TIME_FORMAT_STRING = 'HH:MM:ss';

@Component({
    selector: 'nx-webgl-modal-select-time-range',
    templateUrl: 'select-time-range.component.html',
    styleUrls: ['select-time-range.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
})
export class WebGlSelectTimeRangeModalContent extends ModalBase<DT['return']> implements OnInit {
    CONFIG: IConfig;
    LANG = staticLang;
    hideErrors = true;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;

    start: number;
    end: number;

    themeClass: string;
    timelineStart: string;
    timelineEnd: string;

    constructor(
        configService: NxConfigService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private selection: DT['data'],
    ) {
        super(dialogRef);

        this.CONFIG = configService.getConfig();
        this.themeClass = this.CONFIG.isDarkTheme ? 'dark' : 'light';
    }

    public closeModal = ($event: Event): void => {
        $event.preventDefault();
        return this.close({ start: this.selection.startDate, end: this.selection.endDate });
    };

    public save = ($event: Event): void => {
        $event.preventDefault();

        const startTime = new Date(this.startDate + 'T' + this.startTime);
        const endTime = new Date(this.endDate + 'T' + this.endTime);

        if (startTime.getTime() > endTime.getTime()) {
            return this.close({ start: endTime, end: startTime });
        } else {
            return this.close({ start: startTime, end: endTime });
        }
    };

    checkMaxMinDate(): void {
        const newStartDate = new Date(this.startDate + 'T' + this.startTime).getTime();

        if (isNaN(newStartDate) || newStartDate < this.selection.timelineStart.getTime()) {
            this.startDate = dateFormat(this.selection.startDate, DATE_FORMAT_STRING);
            this.startTime = dateFormat(this.selection.startDate, TIME_FORMAT_STRING);
        }

        const newEndDate = new Date(this.endDate + 'T' + this.endTime).getTime();

        if (isNaN(newEndDate) || newEndDate > this.selection.timelineEnd.getTime()) {
            this.endDate = dateFormat(this.selection.endDate, DATE_FORMAT_STRING);
            this.endTime = dateFormat(this.selection.endDate, TIME_FORMAT_STRING);
        }
    }

    private initSelectionDates(): void {
        this.startDate = dateFormat(this.selection.startDate, DATE_FORMAT_STRING);
        this.startTime = dateFormat(this.selection.startDate, TIME_FORMAT_STRING);
        this.endDate = dateFormat(this.selection.endDate, DATE_FORMAT_STRING);
        this.endTime = dateFormat(this.selection.endDate, TIME_FORMAT_STRING);
    }

    ngOnInit(): void {
        this.initSelectionDates();
    }
}
