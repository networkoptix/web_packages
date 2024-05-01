import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

type Style = NonNullable<Intl.DateTimeFormatOptions['dateStyle']>;
type FormatKey = `${Style}${'Date' | 'Time'}`;

/** Thin wrapper around Intl.DateTimeFormat formatting method
 *
 * MDN: [`Intl.DateTimeFormat.format()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/format)
 */
@Injectable({
    providedIn: 'root',
})
export class NxDateTimeFormatService {
    private translate = inject(TranslateService);

    get locale(): string {
        return this.translate.currentLang.replace('_', '-'); // e.g. en_US => en-US
    }

    private formatMap = Object.fromEntries(
        (['short', 'medium', 'long', 'full'] as Style[]).flatMap(s => [
            [`${s}Date`, new Intl.DateTimeFormat(this.locale, { dateStyle: s })],
            [`${s}Time`, new Intl.DateTimeFormat(this.locale, { timeStyle: s })],
        ]),
    ) as Record<FormatKey, Intl.DateTimeFormat>;

    private methodPassthrough(key: FormatKey): Intl.DateTimeFormat['format'] {
        return this.formatMap[key].format; // Defaults to now if date arg not provided
    }

    /* All examples are in en-US */

    /** Example: 4/24/24 */
    toShortDateString = this.methodPassthrough('shortDate');
    /** Example: Apr 24, 2024 */
    toMediumDateString = this.methodPassthrough('mediumDate');
    /** Example: April 24, 2024 */
    toLongDateString = this.methodPassthrough('longDate');
    /** Example: Wednesday, April 24, 2024 */
    toFullDateString = this.methodPassthrough('fullDate');

    /** Example: 3:14 PM */
    toShortTimeString = this.methodPassthrough('shortTime');
    /** Example: 3:14:37 PM */
    toMediumTimeString = this.methodPassthrough('mediumTime');
    /** Example: 3:14:41 PM PDT */
    toLongTimeString = this.methodPassthrough('longTime');
    /** Example: 3:14:47 PM Pacific Daylight Time */
    toFullTimeString = this.methodPassthrough('fullTime');
}
