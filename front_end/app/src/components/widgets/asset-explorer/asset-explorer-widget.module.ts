import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ComponentsCoreModule } from '@components/components-core.module';
import { NumericModule } from '@components/numeric-input/numeric.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { SharedComponentsModule } from '@components/shared-components.module';
import { StepperModule } from '@components/stepper/stepper.module';

import { NxAssetExplorerWidgetComponent } from './asset-explorer-widget.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        SharedComponentsModule,
        ComponentsCoreModule,
        CheckboxModule,
        PreLoaderModule,
        StepperModule,
        NumericModule,
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
