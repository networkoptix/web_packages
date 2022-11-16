import { NgModule } from '@angular/core';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';

import { NxDateAndTimeFilterComponent } from './date-and-time-filter.component';

@NgModule({
    imports: [
        MatDatepickerModule,
        MatNativeDateModule,
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
    ],
    declarations: [
        NxDateAndTimeFilterComponent,
    ],
    providers: [],
    exports: [
        NxDateAndTimeFilterComponent,
    ]
})
export class NxDateAndTimeFilterModule {}
