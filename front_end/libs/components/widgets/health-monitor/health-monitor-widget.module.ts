import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxNumericComponent } from '@components/numeric-input/numeric.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { StepperModule } from '@components/stepper/stepper.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxHealthMonitorWidgetComponent } from './health-monitor-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        CdkStepperModule,
        CdkTableModule,
        NxCheckboxComponent,
        NxNumericComponent,
        NxGenericDropdownModule,
        PipesModule,
        NxPreLoaderComponent,
        StepperModule,
    ],
    declarations: [NxHealthMonitorWidgetComponent],
    providers: [NxHealthMonitorWidgetComponent],
    exports: [NxHealthMonitorWidgetComponent],
})
export class HealthMonitorWidgetModule {}
