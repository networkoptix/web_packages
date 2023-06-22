import { OverlayModule } from '@angular/cdk/overlay';
import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import { PipesModule } from '@app/pipes/pipes.module';
import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { TagModule } from '@components/tag/tag.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxAccountSecurityComponent } from './security.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        CdkScrollableModule,
        NgxTranslateCutModule,
        OverlayModule,
        CheckboxModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        PipesModule,
        PreLoaderModule,
        TagModule,
    ],
    providers: [],
    declarations: [NxAccountSecurityComponent],
    bootstrap: [],
    exports: [NxAccountSecurityComponent],
})
export class NxAccountSecurityModule {}
