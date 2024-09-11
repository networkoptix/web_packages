import { Component, computed, EventEmitter, inject, input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import staticLang from '@language_static';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { ReportExportFormat } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { icons } from '@static-variables';

import { NxMonthSelectComponent } from '../month-select/month-select.component';

@Component({
    selector: 'nx-reports-header',
    templateUrl: 'reports-header.component.html',
    styleUrl: 'reports-header.component.scss',
    standalone: true,
    imports: [TranslateModule, AngularSvgIconModule, NxMonthSelectComponent],
})
export class NxReportsHeaderComponent {
    LANG = staticLang;
    icons = icons;

    heading = input.required<string>();
    selectedEntityName = input.required<string>();
    initExport = input<(format: ReportExportFormat) => void>();
    monthIndex = input.required<number>();
    year = input.required<number>();

    @Output() onMonthIndexChange = new EventEmitter<number>();
    @Output() onYearChange = new EventEmitter<number>();

    protected longMonthFullYearFormat = new Intl.DateTimeFormat(
        inject(NxDateTimeFormatService).locale,
        {
            month: 'long',
            year: 'numeric',
        },
    );
    longMonthFullYear = computed<string>(() =>
        this.longMonthFullYearFormat.format(new Date(this.year(), this.monthIndex())),
    );
}
