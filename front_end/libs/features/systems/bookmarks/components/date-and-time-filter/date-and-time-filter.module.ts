import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';

import { NxTimeSelectorModule } from '../time-selector/time-selector.module';

import { NxDateAndTimeFilterComponent } from './date-and-time-filter.component';

@NgModule({
    imports: [
        CommonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        AngularSvgIconModule,

        NxTimeSelectorModule,
        NxAddSvgSrcDirective,
        TranslateModule,
    ],
    declarations: [NxDateAndTimeFilterComponent],
    providers: [],
    exports: [NxDateAndTimeFilterComponent],
})
export class NxDateAndTimeFilterModule {}
