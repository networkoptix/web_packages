import { Component, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { DateRange as DR } from '@angular/material/datepicker';

import { icons } from '@lib/variables/static-variables';

import type { TimeRange } from '../../bookmarks.types';

const DAY_MS = 1000 * 60 * 60 * 24;

type DateRange = DR<Date>;

@Component({
    selector: 'nx-date-and-time-filter',
    templateUrl: 'date-and-time-filter.component.html',
    styleUrls: ['date-and-time-filter.component.scss'],
    encapsulation: ViewEncapsulation.None,
    // Need to style inside mat-calendar
})
export class NxDateAndTimeFilterComponent {
    @Input() dateRange: DateRange | null;
    @Output() dateRangeChange = new EventEmitter<DateRange | null>();

    @Input() timeRange: TimeRange;
    @Output() timeRangeChange = new EventEmitter<TimeRange>();

    icons = icons;

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

    quickSelectMatch(range: DateRange): boolean {
        if (!this.dateRange) {
            return false;
        }
        return (
            this.dateRange.start.toDateString() === range.start.toDateString() &&
            this.dateRange.end.toDateString() === range.end.toDateString()
        );
    }

    quickSelect(selected: DateRange): void {
        this.dateRangeChange.emit(selected);
    }

    selectedChange(selected: Date): void {
        this.dateRangeChange.emit(new DR(selected, selected));
    }

    clear(): void {
        this.dateRangeChange.emit(null);
    }

    setStartTime(time: string): void {
        this.timeRange.start = time;
    }

    setEndTime(time: string): void {
        this.timeRange.end = time;
    }
}
