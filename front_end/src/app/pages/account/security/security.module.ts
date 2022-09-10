import { OverlayModule } from '@angular/cdk/overlay';
import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxAccountSecurityComponent } from './security.component';

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
        CdkScrollableModule,
        OverlayModule,
        ContentBlockModule
    ],
    providers: [],
    declarations: [
        NxAccountSecurityComponent
    ],
    bootstrap: [],
    exports: [
        NxAccountSecurityComponent
    ]
})
export class NxAccountSecurityModule {
}
