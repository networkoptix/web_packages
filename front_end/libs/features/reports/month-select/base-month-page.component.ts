import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { offsetDate } from '@utils/general';
import { paramModel } from '@utils/signals';

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

    protected parseDateParam(dateParam: string | undefined):
        | {
              year: number;
              month: number;
          }
        | undefined {
        if (!dateParam) {
            return undefined;
        }

        const [year, month] = dateParam.split('-').map(part => parseInt(part));
        const isMonthValid = !!month && month >= 1 && month <= 12;
        if (!year || !isMonthValid) {
            return undefined;
        }
        return { year, month };
    }

    dateParam = paramModel('date');
    dateParam$ = toObservable(this.dateParam);
    constructor(private destroyRef: DestroyRef) {
        // Set year/month using date query param if available + valid on initial page load
        this.dateParam$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(dateParam => {
            const parsedDate = this.parseDateParam(dateParam);
            if (parsedDate) {
                this.year.set(parsedDate.year);
                this.monthIndex.set(parsedDate.month - 1);
            } else {
                const currentDate = new Date();
                this.year.set(currentDate.getFullYear());
                this.monthIndex.set(currentDate.getMonth());
            }
        });
    }

    dateEffect = effect(
        () => {
            this.dateParam.set(this.requestStartString());
        },
        { allowSignalWrites: true },
    );
}
