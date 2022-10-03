import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentsModule } from '@components/components.module';
import { DirectivesModule } from '@directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxIntegrationsComponent } from './integrations.component';
import { IntegrationsListModule } from './list/list.module';

const appRoutes: Routes = [
    {
        path: '',
        component: NxIntegrationsComponent
    }

];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        FormsModule,
        IntegrationsListModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [],
    declarations: [
        NxIntegrationsComponent
    ],
    bootstrap: [],
    exports: [
        NxIntegrationsComponent
    ]
})
export class IntegrationsModule {
}
