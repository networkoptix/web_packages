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

const oneToTwelve = '(0?[1-9])|(1[1-2])';
const zeroToTwentyfour = '(0?\\d)|(1\\d)|(2[0-4])';
const zerozeroToFiftynine = '[0-5]\\d';

const hour12Regex = new RegExp(
    `^\\s*(${oneToTwelve}):${zerozeroToFiftynine}\\s*$`
);
const hour24Regex = new RegExp(
    `^\\s*(${zeroToTwentyfour}):${zerozeroToFiftynine}\\s*$`
);

@Component({
    selector: 'nx-time-selector',
    templateUrl: 'time-selector.component.html',
    styleUrls: ['time-selector.component.scss'],
})
export class NxTimeSelectorComponent implements OnInit {
    @Input() time: string;
    @Output() timeChange = new EventEmitter<string>();

    icons = icons;
    AM = staticLang.view.timeline.timeNames.AM;
    PM = staticLang.view.timeline.timeNames.PM;

    hour12: boolean;
    value: string = '';
    timeRegex: RegExp;
    period: string = this.AM;
    placeholder: string;

    constructor(@Inject(LOCALE_ID) locale: string) {
        // https://stackoverflow.com/a/63736713
        this.hour12 = Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;

        this.timeRegex = this.hour12 ? hour12Regex : hour24Regex;
        this.placeholder = this.hour12 ? '12:00' : '00:00';
    }

    ngOnInit(): void {
        this.value = this.time;
    }

    emitValue(value: string = this.value): void {
        const trimmed = value.trim();
        const validValue = this.timeRegex.test(trimmed);
        if (validValue) {
            if (this.hour12) {
                const [hours, minutes] = trimmed.split(':');
                if (this.period === this.AM) {
                    if (hours === '12') {
                        this.timeChange.emit(`00:${minutes}`); // 12 AM => 00:00
                    } else {
                        this.timeChange.emit(trimmed);
                    }
                } else {
                    if (hours === '12') {
                        this.timeChange.emit(trimmed); // 12 PM = 12:00
                    } else {
                        this.timeChange.emit(`${Number(hours) + 12}:${minutes}`);
                    }
                }
            } else {
                this.timeChange.emit(trimmed);
            }
        } else {
            this.timeChange.emit('');
        }
    }
}
