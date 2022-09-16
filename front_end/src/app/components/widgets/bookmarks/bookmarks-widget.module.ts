import { OverlayModule } from '@angular/cdk/overlay';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsCoreModule } from '@components/components-core.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { StepperModule } from '@components/stepper/stepper.module';
import { TagModule } from '@components/tag/tag.module';

import { NxBookmarksWidgetComponent } from './bookmarks-widget.component';

@NgModule({
    imports: [
        AngularSvgIconModule.forRoot(),
        ComponentsCoreModule,
        PreLoaderModule,
        StepperModule,
        TagModule,
        OverlayModule
    ],
    declarations: [
        NxBookmarksWidgetComponent
    ],
    providers: [
        NxBookmarksWidgetComponent
    ],
    exports: [
        NxBookmarksWidgetComponent
    ]
})

export class BookmarksWidgetModule { }
