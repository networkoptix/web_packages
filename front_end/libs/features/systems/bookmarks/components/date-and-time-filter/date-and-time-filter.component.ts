import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { DateRange as DR } from '@angular/material/datepicker';

import { icons } from '@lib/variables/static-variables';

const DAY_MS = 1000 * 60 * 60 * 24;

type DateRange = DR<Date>;

@Component({
    selector: 'nx-date-and-time-filter',
    templateUrl: 'date-and-time-filter.component.html',
    styleUrls: ['date-and-time-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    // Need to style inside mat-calendar
})
export class NxDateAndTimeFilterComponent implements OnInit {
    icons = icons;

    selected: DateRange | null = null;
    preview: DateRange | null = null;

    get lastDay(): DateRange {
        const now = new Date();
        return new DR(now, now);
    }

    get last7Days(): DateRange {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
        return new DR(sevenDaysAgo, now);
    }

    get last30Days(): DateRange {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
        return new DR(thirtyDaysAgo, now);
    }

    ngOnInit(): void {}

    quickSelectMatch(range: DateRange): boolean {
        if (!this.selected) {
            return false;
        }
        return (
            this.selected.start.toDateString() === range.start.toDateString() &&
            this.selected.end.toDateString() === range.end.toDateString()
        );
    }

    selectedChange(selected: Date): void {
        this.selected = new DR(selected, selected);
    }
}
