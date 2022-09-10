import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { ContentBlockModule } from '@components/content-block/content-block.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@app/pipes/pipes.module';

import { NxIntegrationsListComponent } from './list.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        DirectivesModule,
        PipesModule,
        TranslateModule,
        ComponentsModule,
        ContentBlockModule,
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
