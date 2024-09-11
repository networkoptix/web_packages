import { DestroyRef, Injectable, computed, effect, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

import { offsetDate } from '@utils/general';
import { paramModel } from '@utils/signals';

/** Monthly filtering functionality for service pages */
@Injectable()
export abstract class BaseMonthPageComponent {
    year = signal<number>(new Date().getFullYear());
    monthIndex = signal<number>(new Date().getMonth());
    protected startDate = computed<Date>(() => new Date(this.year(), this.monthIndex()));
    protected endDate = computed<Date>(() => offsetDate(this.startDate().getTime(), { month: 1 }));

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

    startTs = paramModel('startTs');
    startTs$ = toObservable(this.startTs);
    constructor(private destroyRef: DestroyRef) {
        this.startTs$.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe(startTs => {
            const now = new Date();
            if (startTs) {
                const [year, month] = startTs.split('-').map(part => parseInt(part));
                this.year.set(year);
                this.monthIndex.set(Math.max(0, month - 1));
            } else if (now.getDate() === 1) {
                if (now.getMonth() === 1) {
                    this.year.set(now.getFullYear() - 1);
                    this.monthIndex.set(11);
                } else {
                    this.monthIndex.set(now.getMonth() - 1);
                }
            }
        });
    }

    dateEffect = effect(
        () => {
            this.startTs.set(this.requestStartString());
        },
        { allowSignalWrites: true },
    );
}
