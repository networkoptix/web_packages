import { CdkMenuModule } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, Output, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { icons } from '@static-variables';
import { connectedPosition } from '@utils/nx';

@Component({
    selector: 'nx-month-select',
    templateUrl: 'month-select.component.html',
    styleUrls: ['month-select.component.scss'],
    standalone: true,
    imports: [CommonModule, CdkMenuModule, AngularSvgIconModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxMonthSelectComponent {
    icons = icons;

    monthIndex = signal<number>(0);
    @Input({ alias: 'monthIndex' }) set _monthIndex(month: number) {
        this.monthIndex.set(month);
    }
    @Output() monthIndexChange = toObservable<number>(this.monthIndex);

    year = signal<number>(0);
    @Input({ alias: 'year' }) set _year(month: number) {
        this.year.set(month);
    }
    @Output() yearChange = toObservable<number>(this.year);

    yearFormat: Intl.DateTimeFormat;
    longMonthYearFormat: Intl.DateTimeFormat;
    longMonths: string[] = [];

    isMenuOpen = signal<boolean>(false);
    display = computed<string>(() => {
        const [year, monthIndex] = [this.year(), this.monthIndex()];
        const isMenuOpen = this.isMenuOpen();
        const date = new Date(year, monthIndex);
        return isMenuOpen ? this.yearFormat.format(date) : this.longMonthYearFormat.format(date);
    });

    menuPosition: ConnectedPosition[] = [
        connectedPosition({ originPoint: 'S', overlayPoint: 'N' }),
    ];

    constructor(nxDatetime: NxDateTimeFormatService) {
        const longMonth = new Intl.DateTimeFormat(nxDatetime.locale, { month: 'long' });
        const date = new Date();
        for (let i = 0; i < 12; i++) {
            date.setMonth(i);
            this.longMonths.push(longMonth.format(date));
        }
        this.yearFormat = new Intl.DateTimeFormat(nxDatetime.locale, {
            year: 'numeric',
        });
        this.longMonthYearFormat = new Intl.DateTimeFormat(nxDatetime.locale, {
            month: 'long',
            year: 'numeric',
        });
    }

    decrementMonth(): void {
        if (this.monthIndex() === 0) {
            this.monthIndex.set(11);
            this.year.update(y => y - 1);
        } else {
            this.monthIndex.update(m => m - 1);
        }
    }

    incrementMonth(): void {
        if (this.monthIndex() === 11) {
            this.monthIndex.set(0);
            this.year.update(y => y + 1);
        } else {
            this.monthIndex.update(m => m + 1);
        }
    }
}
