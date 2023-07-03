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
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { PrimaryButtonModule } from '@components/primary-button/primary-button.module';
import { NxTagComponent } from '@components/tag/tag.component';
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
        NxCheckboxComponent,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        PipesModule,
        NxPreLoaderComponent,
        NxTagComponent,
        PrimaryButtonModule,
    ],
    providers: [],
    declarations: [NxAccountSecurityComponent],
    bootstrap: [],
    exports: [NxAccountSecurityComponent],
})
export class NxAccountSecurityModule {}
