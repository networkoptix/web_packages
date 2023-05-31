import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { ContentBlockSectionModule } from '@components/content-block/section/section.module';
import { FooterModule } from '@components/footer/footer.module';
import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';
import { TagModule } from '@components/tag/tag.module';
import { DirectivesModule } from '@directives/directives.module';

import { NxIntegrationsListComponent } from './list.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        ContentBlockModule,
        ContentBlockSectionModule,
        DirectivesModule,
        FooterModule,
        PipesModule,
        PreLoaderModule,
        TagModule,
    ],
    providers: [],
    declarations: [
        NxIntegrationsListComponent
    ],
    bootstrap: [],
    exports: [
        NxIntegrationsListComponent
    ]
})
export class IntegrationsListModule {
}
