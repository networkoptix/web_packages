import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxFooterComponent } from '@components/footer/footer.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@pipes/pipes.module';

import { NxIntegrationsListComponent } from './list.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        DirectivesModule,
        NxFooterComponent,
        PipesModule,
        NxPreLoaderComponent,
        NxTagComponent,
    ],
    providers: [],
    declarations: [NxIntegrationsListComponent],
    bootstrap: [],
    exports: [NxIntegrationsListComponent],
})
export class IntegrationsListModule {}
