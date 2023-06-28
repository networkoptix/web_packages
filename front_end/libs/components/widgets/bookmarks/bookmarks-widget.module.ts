import { OverlayModule } from '@angular/cdk/overlay';
import { NgModule } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { StepperModule } from '@components/stepper/stepper.module';
import { TagModule } from '@components/tag/tag.module';

import { NxBookmarksWidgetComponent } from './bookmarks-widget.component';

@NgModule({
    imports: [AngularSvgIconModule, NxPreLoaderComponent, StepperModule, TagModule, OverlayModule],
    declarations: [NxBookmarksWidgetComponent],
    providers: [NxBookmarksWidgetComponent],
    exports: [NxBookmarksWidgetComponent],
})
export class BookmarksWidgetModule {}
