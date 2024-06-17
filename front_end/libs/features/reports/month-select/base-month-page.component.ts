import { Injectable, computed, inject, signal } from '@angular/core';

import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { offsetDate } from '@utils/general';

/** Monthly filtering functionality for service pages */
@Injectable()
export abstract class BaseMonthPageComponent {
    year = signal<number>(new Date().getFullYear());
    monthIndex = signal<number>(new Date().getMonth());
    protected startDate = computed<Date>(() => new Date(this.year(), this.monthIndex()));
    protected endDate = computed<Date>(() => offsetDate(this.startDate().getTime(), { month: 1 }));

    protected longMonthFullYearFormat = new Intl.DateTimeFormat(
        inject(NxDateTimeFormatService).locale,
        {
            month: 'long',
            year: 'numeric',
        },
    );
    longMonthFullYear = computed<string>(() =>
        this.longMonthFullYearFormat.format(this.startDate()),
    );

    protected requestStartString = computed<string>(() => this.YmdString(this.startDate()));
    protected requestEndString = computed<string>(() => this.YmdString(this.endDate()));
    protected YmdString(date: Date): string {
        // %Y-%m-%d in Python formatting
        // https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes
        const Y = date.getFullYear();
        const m = `${date.getMonth() + 1}`.padStart(2, '0');
        const d = `${date.getDate()}`.padStart(2, '0');
        return `${Y}-${m}-${d}`;
    }
}
