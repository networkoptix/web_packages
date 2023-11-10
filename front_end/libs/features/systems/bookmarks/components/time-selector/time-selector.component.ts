import {
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
    ViewChild,
    ElementRef,
    OnChanges,
} from '@angular/core';
import { escapeRegExp } from 'lodash-es';
import type { BehaviorSubject } from 'rxjs';

import { MS } from '@utils/general';
import type { NgChanges } from '@utils/ng-changes';
import { icons } from '@variables/static-variables';

const oneToTwelve = '((0?[1-9])|(1[0-2]))';
const zeroToTwentythree = '((0?\\d)|(1\\d)|(2[0-3]))';
const zerozeroToFiftynine = '[0-5]\\d';

class DateTimeHelper {
    parts: Intl.DateTimeFormatPart[];
    static readonly dayStart = new Date(2000, 0, 0, 0, 0);
    static readonly dayEnd = new Date(2000, 0, 0, 23, 59);

    constructor(private dtf: Intl.DateTimeFormat) {
        this.parts = dtf.formatToParts(new Date());
    }

    numericalForm(date: Date): string {
        // Hour, separator, minute
        const parts = this.dtf.formatToParts(date);
        const hourIndex = parts.findIndex(p => p.type === 'hour');
        return parts
            .slice(hourIndex, hourIndex + 3)
            .map(p => p.value)
            .join('');
    }

    get hour12Regex(): RegExp {
        return new RegExp(`^\\s*${oneToTwelve}${this.separator}${zerozeroToFiftynine}\\s*$`);
    }

    get hour24Regex(): RegExp {
        return new RegExp(`^\\s*${zeroToTwentythree}${this.separator}${zerozeroToFiftynine}\\s*$`);
    }

    get postPeriod(): boolean {
        // Might be preperiod e.g. ko => 오후 5:55
        return this.partIndex('hour') < this.partIndex('dayPeriod');
    }

    get separator(): string {
        // Separator might not be ":" e.g. da => 16.20
        return escapeRegExp(this.parts[this.partIndex('hour') + 1].value);
    }

    get dayPeriods(): [string, string] {
        const AM = this.dtf
            .formatToParts(DateTimeHelper.dayStart)
            .find(p => p.type === 'dayPeriod').value;
        const PM = this.dtf
            .formatToParts(DateTimeHelper.dayEnd)
            .find(p => p.type === 'dayPeriod').value;
        return [AM, PM];
    }

    get hour12(): boolean {
        return this.dtf.resolvedOptions().hour12;
    }

    get timeRegex(): RegExp {
        return this.hour12 ? this.hour12Regex : this.hour24Regex;
    }

    partByType(type: Intl.DateTimeFormatPartTypes): Intl.DateTimeFormatPart {
        return this.parts.find(p => p.type === type);
    }

    partIndex(type: Intl.DateTimeFormatPartTypes): number {
        return this.parts.findIndex(p => p.type === type);
    }

    partValue(type: Intl.DateTimeFormatPartTypes): string {
        return this.partByType(type).value;
    }

    msToHour24(ms: number): string {
        const hours = Math.floor(ms / MS.hr);
        const minutes = (ms - hours * MS.hr) / MS.min;
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        return this.numericalForm(date);
    }

    msToHour12(ms: number): [time: string, PM: boolean] {
        const hours = Math.floor(ms / MS.hr);
        const minutes = (ms - hours * MS.hr) / MS.min;
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        return [this.numericalForm(date), hours >= 12];
    }
}

@Component({
    selector: 'nx-time-selector',
    templateUrl: 'time-selector.component.html',
    styleUrls: ['time-selector.component.scss'],
})
export class NxTimeSelectorComponent implements OnInit, OnChanges {
    @Input() time: number | null;
    @Output() timeChange = new EventEmitter<number | null>();

    @Input() point: 'start' | 'end' = 'start';
    @Input() error$?: BehaviorSubject<boolean>; // Only for endpoint

    @ViewChild('periodBtn') periodBtn: ElementRef<HTMLDivElement>;

    icons = icons;
    AM: string;
    PM: string;

    hour12: boolean;
    value: string = '';
    timeRegex: RegExp;
    period: string;
    placeholder: string;
    lastValidValue: string | null = null;
    postPeriod: boolean = true;

    ngOnInit(): void {
        const dtFormat = Intl.DateTimeFormat(navigator.language, {
            hour: 'numeric',
            minute: 'numeric',
            numberingSystem: 'latn', // Avoid Arabic/other non-latin numbers
        });

        const dtHelper = new DateTimeHelper(dtFormat);

        this.placeholder = dtHelper.numericalForm(DateTimeHelper.dayStart);
        this.timeRegex = dtHelper.timeRegex;

        this.hour12 = dtHelper.hour12;
        if (this.hour12) {
            [this.AM, this.PM] = dtHelper.dayPeriods;
            this.period = this.AM;
            this.postPeriod = dtHelper.postPeriod;
        }

        if (this.time !== null) {
            if (this.hour12) {
                const [time, PM] = dtHelper.msToHour12(this.time);
                this.value = time;
                this.lastValidValue = time;
                this.period = PM ? this.PM : this.AM;
            } else {
                this.value = dtHelper.msToHour24(this.time);
                this.lastValidValue = this.value;
            }
        }
    }

    ngOnChanges({ time }: NgChanges<NxTimeSelectorComponent>): void {
        if (!time.firstChange && time.currentValue === null) {
            // Clear from main filter
            this.value = '';
        }
    }

    h24StrToMs(time: string): number {
        let [hours, minutes] = time
            .match(/(\d+)\D+(\d+)/)
            .slice(1)
            .map(Number);
        if (!hours && !minutes && this.point === 'end') {
            hours += 24;
        }
        return MS.hr * hours + MS.min * minutes;
    }

    h12StrToMs(time: string): number {
        let [hours, minutes] = time
            .match(/(\d+)\D+(\d+)/)
            .slice(1)
            .map(Number);
        if (hours < 12 && this.period === this.PM) {
            hours += 12;
        } else if (hours === 12 && this.period === this.AM) {
            if (this.point === 'end' && !minutes) {
                hours += 12;
            } else {
                hours -= 12;
            }
        }
        return MS.hr * hours + MS.min * minutes;
    }

    emitValue(value: string = this.value): void {
        this.error$?.next(false);
        const trimmed = value.trim();
        const validValue = this.timeRegex.test(trimmed);
        if (validValue) {
            this.lastValidValue = trimmed;
            this.timeChange.emit(this.hour12 ? this.h12StrToMs(trimmed) : this.h24StrToMs(trimmed));
        } else if (!trimmed) {
            this.lastValidValue = null;
            this.timeChange.emit(null);
        }
    }

    /**
     * Because there is no incremental adjustment, changes are made by
     * deleting and typing. But because filtering is supposed to be instant
     * without having to click an apply button, we want the last valid value
     * to "stick" until either the input is cleared or another valid value is
     * typed instead of immediately clearing filtering on an invalid value.
     */
    onBlur(): void {
        if (!this.lastValidValue || this.lastValidValue === this.value) {
            // No stored value or valid value
        } else if (!this.value.trim()) {
            this.value = '';
        } else if (!this.timeRegex.test(this.value.trim())) {
            this.value = this.lastValidValue;
        }
    }
}
