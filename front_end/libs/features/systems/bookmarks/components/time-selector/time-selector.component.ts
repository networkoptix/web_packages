import { Component, Inject, LOCALE_ID, OnInit } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { icons } from '@src/app/variables/static-variables';

const oneToTwelve = '(0?[1-9])|(1[1-2])';
const zeroToTwentyfour = '(0?\\d)|(1\\d)|(2[0-4])';
const zerozeroToFiftynine = '[0-5]\\d';

const hour12Regex = new RegExp(
    `^(${oneToTwelve}):${zerozeroToFiftynine}$`
);
const hour24Regex = new RegExp(
    `^(${zeroToTwentyfour}):${zerozeroToFiftynine}$`
);

@Component({
    selector: 'nx-time-selector',
    templateUrl: 'time-selector.component.html',
    styleUrls: ['time-selector.component.scss'],
})
export class NxTimeSelectorComponent implements OnInit {
    icons = icons;
    AM = staticLang.view.timeline.timeNames.AM;
    PM = staticLang.view.timeline.timeNames.PM;

    hour12: boolean;
    time: string = '';
    timeRegex: RegExp;
    period: string = this.AM;
    placeholder: string;

    constructor(@Inject(LOCALE_ID) locale: string) {
        // https://stackoverflow.com/a/63736713
        this.hour12 = Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;

        this.timeRegex = this.hour12 ? hour12Regex : hour24Regex;
        this.placeholder = this.hour12 ? '12:00' : '00:00';

        // TODO: Connect state
    }

    ngOnInit(): void {}
}
