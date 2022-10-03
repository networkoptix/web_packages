import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxIntegrationsListComponent } from './list.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        DirectivesModule,
        PipesModule,
        NgbModule,
        TranslateModule,
        ComponentsModule
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
