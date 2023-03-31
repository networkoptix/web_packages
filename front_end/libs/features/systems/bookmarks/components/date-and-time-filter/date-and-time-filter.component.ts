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
import { DateAdapter } from '@angular/material/core';
import { DateRange as DR, MatCalendar } from '@angular/material/datepicker';
import { BehaviorSubject } from 'rxjs';

import { icons } from '@lib/variables/static-variables';
import { WINDOW } from '@services/window-provider';
import { offsetDate } from '@utils/general';
import { getSysLang } from '@utils/nx';

import type { TimeRange } from '../../bookmarks.types';

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

    timeRangeError$ = new BehaviorSubject<boolean>(false);

    icons = icons;

    private hoveredDate: Date | null = null;
    private hoverTimeout: number;
    quickPreview: DateRange | null = null;

    private get singleDayRange(): boolean {
        return this.dateRange && this.dateRange.start.toString() === this.dateRange.end.toString();
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

    get todayStart(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    get lastDay(): DateRange {
        const today = this.todayStart;
        return new DR(today, today);
    }

    get last7Days(): DateRange {
        const today = this.todayStart;
        /* MM/DD - MM/DD is already one day on the calendar,
        so for two day range MM/(DD-1) - MM/DD we subtract only one */
        const sevenDaysAgo = offsetDate(today.getTime(), { day: -6 });
        return new DR(sevenDaysAgo, today);
    }

    get last30Days(): DateRange {
        const today = this.todayStart;
        const thirtyDaysAgo = offsetDate(today.getTime(), { day: -29 });
        return new DR(thirtyDaysAgo, today);
    }

    constructor(dateAdapter: DateAdapter<Date>, @Inject(WINDOW) private window: Window) {
        dateAdapter.setLocale(getSysLang(window));
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
        if (!this.invalidTimeRange(selected)) {
            this.dateRangeChange.emit(selected);
            this.hoveredDate = null;
            this.timeRangeError$.next(false);
        } else {
            this.dateRange = selected;
            this.timeRangeError$.next(true);
        }
    }

    selectedChange(selected: Date): void {
        let newRange: DateRange;
        if (!this.dateRange) {
            newRange = new DR(selected, selected);
        } else if (this.singleDayRange && selected.toString() !== this.dateRange.start.toString()) {
            newRange =
                selected.getTime() > this.dateRange.start.getTime()
                    ? new DR(this.dateRange.start, selected)
                    : new DR(selected, this.dateRange.start);
        } else {
            newRange = new DR(selected, selected);
        }
        if (!this.invalidTimeRange(newRange)) {
            this.dateRangeChange.emit(newRange);
            this.hoveredDate = null;
            this.timeRangeError$.next(false);
        } else {
            this.dateRange = newRange;
            // Change calendar selection, but don't emit update for invalid range
            this.timeRangeError$.next(true);
        }
    }

    clear(): void {
        this.dateRangeChange.emit(null);
        this.timeRange.start = null;
        this.timeRange.end = null;
        this.timeRangeChange.emit(this.timeRange);
        this.hoveredDate = null;
        this.timeRangeError$.next(false);
    }

    setTimePoint(point: 'start' | 'end', time: number | null): void {
        this.timeRange[point] = time;

        if (this.invalidTimeRange()) {
            this.timeRangeError$.next(true);
            return;
        } else if (this.timeRange.start !== null && this.timeRange.end !== null) {
            this.timeRangeChange.emit(this.timeRange);
            if (!this.dateRange) {
                const today = this.todayStart;
                this.dateRangeChange.emit(new DR(today, today));
            } else {
                this.dateRangeChange.emit(this.dateRange);
                // In case invalid time change stopped original date range emit
            }
        } else if (this.timeRange.start === null && this.timeRange.end === null) {
            this.timeRangeChange.emit(this.timeRange);
            this.dateRangeChange.emit(this.dateRange);
        }
        this.timeRangeError$.next(false);
    }

    /** Check for invalid datetime range.
     *
     * - Oct 12 4PM - Oct 13 2AM ✔️
     * - Oct 12 4PM - Oct 12 2AM ❌
     */
    private invalidTimeRange(dateRange = this.dateRange): boolean {
        return (
            (this.timeRange.start ?? Number.NEGATIVE_INFINITY) >
                (this.timeRange.end ?? Number.POSITIVE_INFINITY) &&
            (!dateRange || dateRange.start.toString() === dateRange.end.toString())
        );
    }
}
