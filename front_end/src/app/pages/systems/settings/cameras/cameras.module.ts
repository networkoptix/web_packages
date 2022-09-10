import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ThreeDotsModule } from '@components/dropdowns/three-dot/three-dots.module';
import { InfoBlockModule } from '@components/info-block/info-block.module';
import { OpenClientSectionPlaceholderModule } from '@components/placeholders/open-client-section/open-client-section.module';
import { PagePlaceHolderModule } from '@components/placeholders/page/page-placeholder.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxCamerasComponent } from './cameras.component';
import {
    NxMotionDetectionOverlay
} from './motion-detection-overlay/motion-detection-overlay.component';
@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        PagePlaceHolderModule,
        OpenClientSectionPlaceholderModule,
        InfoBlockModule,
        AlertBlockModule,
        ThreeDotsModule,
        ContentBlockModule
    ],
    providers: [
    ],
    declarations: [
        NxCamerasComponent,
        NxMotionDetectionOverlay
    ],
    bootstrap: [
    ],
    exports: [
        NxCamerasComponent
    ]
})
export class NxCamerasModule {
}
