import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

type Style = NonNullable<Intl.DateTimeFormatOptions['dateStyle']>;
type FormatKey = `${Style}${'Date' | 'Time'}` | `${Style}Date,${Style}Time`;

const styles: Style[] = ['short', 'medium', 'long', 'full'];

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
        styles.flatMap(style => [
            [`${style}Date`, new Intl.DateTimeFormat(this.locale, { dateStyle: style })],
            [`${style}Time`, new Intl.DateTimeFormat(this.locale, { timeStyle: style })],
            ...styles.map(s2 => [
                `${style}Date,${s2}Time`,
                new Intl.DateTimeFormat(this.locale, { dateStyle: style, timeStyle: s2 }),
            ]),
        ]),
    ) as Record<FormatKey, Intl.DateTimeFormat>;

    private methodPassthrough(key: FormatKey): Intl.DateTimeFormat['format'] {
        return this.formatMap[key].format; // Defaults to now if date arg not provided
    }

    /* All examples are in en-US */

    /** Example: 4/24/24 */
    shortDateString = this.methodPassthrough('shortDate');
    /** Example: Apr 24, 2024 */
    mediumDateString = this.methodPassthrough('mediumDate');
    /** Example: April 24, 2024 */
    longDateString = this.methodPassthrough('longDate');
    /** Example: Wednesday, April 24, 2024 */
    fullDateString = this.methodPassthrough('fullDate');

    /** Example: 3:14 PM */
    shortTimeString = this.methodPassthrough('shortTime');
    /** Example: 3:14:37 PM */
    mediumTimeString = this.methodPassthrough('mediumTime');
    /** Example: 3:14:41 PM PDT */
    longTimeString = this.methodPassthrough('longTime');
    /** Example: 3:14:47 PM Pacific Daylight Time */
    fullTimeString = this.methodPassthrough('fullTime');

    /** Example: 5/8/24, 2:06 PM */
    shortDateShortTimeString = this.methodPassthrough('shortDate,shortTime');
    /** Example: May 8, 2024, 2:06 PM */
    mediumDateShortTimeString = this.methodPassthrough('mediumDate,shortTime');
    // Add as needed
}
