import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { PipesModule } from '@app/pipes/pipes.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxCloudStorageComponent } from './cloud-storage.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        CdkTableModule,
        NgxMaskModule.forRoot(),
        AlertBlockModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        PipesModule,
        PreLoaderModule,
    ],
    providers: [
    ],
    declarations: [
        NxCloudStorageComponent
    ],
    bootstrap: [
    ],
    exports: [
        NxCloudStorageComponent
    ]
})
export class NxCloudStorageModule {
}
