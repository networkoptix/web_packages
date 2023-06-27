import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { PipesModule } from '@app/pipes/pipes.module';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
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
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        FooterModule,
        PipesModule,
        PreLoaderModule,
        TagModule,
    ],
    providers: [],
    declarations: [NxIntegrationsListComponent],
    bootstrap: [],
    exports: [NxIntegrationsListComponent],
})
export class IntegrationsListModule {}
