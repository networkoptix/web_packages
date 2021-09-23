import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterModule }         from '@angular/router';
import { FormsModule }          from '@angular/forms';
import { NgbModule }            from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }      from '@ngx-translate/core';

import { DirectivesModule }         from '@directives/directives.module';
import { ComponentsModule }         from '@components/components.module';
import { NxMotionDetectionOverlay } from './motion-detection-overlay/motion-detection-overlay.component';
import { NxCamerasComponent }       from './cameras.component';
import { PipesModule } from '@src/pipes/pipes.module';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        NgbModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot()
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
