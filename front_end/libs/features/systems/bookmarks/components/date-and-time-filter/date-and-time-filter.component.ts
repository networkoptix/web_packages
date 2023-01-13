import {
    Component,
    ViewEncapsulation,
    Input,
    Output,
    EventEmitter,
    HostListener,
    ViewChild,
    Inject,
} from '@angular/core';
import { DateRange as DR, MatCalendar } from '@angular/material/datepicker';

import { icons } from '@lib/variables/static-variables';
import { WINDOW } from '@services/window-provider';

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

    @ViewChild('matCalendar') private matCalendar: MatCalendar<Date>;

    icons = icons;

    private hoveredDate: Date | null = null;
    private hoverTimeout: number;
    quickPreview: DateRange | null = null;

    private get singleDayRange(): boolean {
        return this.dateRange &&
            this.dateRange.start.toString() === this.dateRange.end.toString();
    }

    // Comparison range start date must be before end
    get comparisonStart(): Date | null {
        if (!this.singleDayRange || !this.hoveredDate) {
            return;
        }
        return this.dateRange.start.getTime() > this.hoveredDate.getTime()
            ? this.hoveredDate
            : this.dateRange.start;
    }

    get comparisonEnd(): Date | null {
        if (!this.singleDayRange || !this.hoveredDate) {
            return;
        }
        return this.dateRange.start.getTime() < this.hoveredDate.getTime()
            ? this.hoveredDate
            : this.dateRange.start;
    }

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

    constructor(@Inject(WINDOW) private window: Window) {
    }

    /* <mat-calendar> doesn't include a way to detect when a cell is
    hovered over, so we have to manually check with mouseover/mouseout */
    @HostListener('mouseover', ['$event'])
    setHoverPreview(e: MouseEvent): void {
        if (
            this.matCalendar.currentView === 'month' &&
            (e.target as HTMLElement).classList.contains('mat-calendar-body-cell-content') &&
            this.singleDayRange
        ) {
            clearTimeout(this.hoverTimeout);
            const target = e.target as HTMLDivElement;
            const day = Number(target.textContent.trim());
            // .activeDate is always in displayed month
            const year = this.matCalendar.activeDate.getFullYear();
            const month = this.matCalendar.activeDate.getMonth();
            this.hoveredDate = new Date(year, month, day);
        }
    }

    /* Because the calendar days aren't completely flush, moving from
    day to day results in an unpleasant flickering as the hover date is
    repeatedly cleared and set. Adding a timeout makes so that as long
    as the mouse is moving quickly enough, the hover date will only be
    cleared after moving the mouse away from the calendar */
    @HostListener('mouseout', ['$event'])
    removeHoverPreview(e: MouseEvent): void {
        if (
            this.matCalendar.currentView === 'month' &&
            this.hoveredDate &&
            (e.target as HTMLElement).classList.contains('mat-calendar-body-cell-content')
        ) {
            this.hoverTimeout = this.window.setTimeout(() => {
                this.hoveredDate = null;
            }, 200);
        }
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
        if (!this.dateRange) {
            this.dateRangeChange.emit(new DR(selected, selected));
        } else if (
            this.singleDayRange &&
            selected.toString() !== this.dateRange.start.toString()
        ) {
            const newRange = selected.getTime() > this.dateRange.start.getTime()
                ? new DR(this.dateRange.start, selected)
                : new DR(selected, this.dateRange.start);
            this.dateRangeChange.emit(newRange);
        } else {
            this.dateRangeChange.emit(new DR(selected, selected));
        }
        this.hoveredDate = null;
    }

    clear(): void {
        this.dateRangeChange.emit(null);
        this.hoveredDate = null;
    }

    setStartTime(time: number | null): void {
        this.timeRange.start = time;
        this.timeRangeChange.emit(this.timeRange);
    }

    setEndTime(time: number | null): void {
        this.timeRange.end = time;
        this.timeRangeChange.emit(this.timeRange);
    }
}
