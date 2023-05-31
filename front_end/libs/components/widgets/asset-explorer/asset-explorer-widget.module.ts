import { CdkStepperModule } from '@angular/cdk/stepper';
import { CdkTreeModule } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxAssetExplorerWidgetComponent } from './asset-explorer-widget.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        AngularSvgIconModule,
        CdkStepperModule,
        CdkTreeModule,
        CheckboxModule,
        DirectivesModule,
        NumericModule,
        PipesModule,
        PreLoaderModule,
        StepperModule,
    ],
    declarations: [
        NxAssetExplorerWidgetComponent
    ],
    providers: [
        NxAssetExplorerWidgetComponent
    ],
    exports: [
        NxAssetExplorerWidgetComponent
    ]
})

export class AssetExplorerWidgetModule {}
