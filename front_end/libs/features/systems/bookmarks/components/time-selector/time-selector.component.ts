import {
    Component,
    Inject,
    LOCALE_ID,
    OnInit,
    Input,
    Output,
    EventEmitter,
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@src/app/variables/static-variables';

const oneToTwelve = '(0?[1-9])|(1[0-2])';
const zeroToTwentyfour = '(0?\\d)|(1\\d)|(2[0-4])';
const zerozeroToFiftynine = '[0-5]\\d';

const hour12Regex = new RegExp(
    `^\\s*(${oneToTwelve}):${zerozeroToFiftynine}\\s*$`
);
const hour24Regex = new RegExp(
    `^\\s*(${zeroToTwentyfour}):${zerozeroToFiftynine}\\s*$`
);

const MIN_MS = 1000 * 60;
const HR_MS = MIN_MS * 60;

function msToHour24(ms: number): string {
    const hours = Math.floor(ms / HR_MS);
    const minutes = ((ms - hours * HR_MS) / MIN_MS)
        .toString()
        .padStart(2, '0');
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

function msToHour12(ms: number): [time: string, PM: boolean] {
    const hours = Math.floor(ms / HR_MS);
    const minutes = ((ms - hours * HR_MS) / MIN_MS)
        .toString()
        .padStart(2, '0');
    if (hours === 0) {
        return [`12:${minutes}`, false]; // 00:00 => 12 AM
    } else if (hours > 0 && hours < 12) {
        return [`${hours}:${minutes}`, false];
    } else if (hours === 12) {
        return [`${hours}:${minutes}`, true]; // 12:00 = 12 PM
    } else if (hours > 12) {
        return [`${hours - 12}:${minutes}`, true];
    }
}

function timeStrToMs(time: string, PM = false): number {
    let [hours, minutes] = time.split(':').map(Number);
    if (PM) {
        hours += 12;
    }
    return HR_MS * hours + MIN_MS * minutes;
}

@Component({
    selector: 'nx-time-selector',
    templateUrl: 'time-selector.component.html',
    styleUrls: ['time-selector.component.scss'],
})
export class NxTimeSelectorComponent implements OnInit {
    @Input() time: number | null;
    @Output() timeChange = new EventEmitter<number | null>();

    icons = icons;
    AM = staticLang.view.timeline.timeNames.AM;
    PM = staticLang.view.timeline.timeNames.PM;

    hour12: boolean;
    value: string = '';
    timeRegex: RegExp;
    period: string = this.AM;
    placeholder: string;
    lastValidValue: string | null = null;

    constructor(@Inject(LOCALE_ID) locale: string) {
        // https://stackoverflow.com/a/63736713
        this.hour12 = Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;

        this.timeRegex = this.hour12 ? hour12Regex : hour24Regex;
        this.placeholder = this.hour12 ? '12:00' : '00:00';
    }

    ngOnInit(): void {
        // Time is sent up as ms for easier calculations
        if (this.time) {
            if (this.hour12) {
                const [time, PM] = msToHour12(this.time);
                this.value = time;
                this.lastValidValue = time;
                this.period = PM ? this.PM : this.AM;
            } else {
                this.value = msToHour24(this.time);
                this.lastValidValue = this.value;
            }
        }
    }

    emitValue(value: string = this.value): void {
        const trimmed = value.trim();
        const validValue = this.timeRegex.test(trimmed);
        if (validValue) {
            this.lastValidValue = trimmed;
            this.timeChange.emit(
                timeStrToMs(trimmed, this.hour12 && this.period === this.PM)
            );
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
