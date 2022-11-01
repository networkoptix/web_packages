import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgxMaskModule } from 'ngx-mask';

import { PipesModule } from '@app/pipes/pipes.module';
import { ComponentsModule } from '@components/components.module';
import { AlertBlockModule } from '@components/content-block/alert/block.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxCloudStorageComponent } from './cloud-storage.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        NgxMaskModule.forRoot(),
        CdkTableModule,
        DirectivesModule,
        PipesModule,
        AngularSvgIconModule.forRoot(),
        AlertBlockModule,
        ContentBlockModule
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
