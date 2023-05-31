import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxEventGeneratorWidgetComponent } from './event-generator.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        CdkStepperModule,
        DirectivesModule,
        NxGenericDropdownModule,
        PreLoaderModule,
        ProcessButtonModule,
        StepperModule,
    ],
    declarations: [
        NxEventGeneratorWidgetComponent
    ],
    providers: [
        NxEventGeneratorWidgetComponent
    ],
    exports: [
        NxEventGeneratorWidgetComponent
    ]
})

export class EventGeneratorModule {}
