import { NgModule }                      from '@angular/core';
import { CommonModule }                  from '@angular/common';
import { RouterModule, Routes }          from '@angular/router';
import { FormsModule }                   from '@angular/forms';
import { TranslateModule }               from '@ngx-translate/core';

import { ComponentsModule }              from '@components/components.module';
import { IntegrationsListModule }        from './list/list.module';
import { DirectivesModule }              from '@directives/directives.module';
import { NxIntegrationsComponent }       from './integrations.component';
import { PipesModule } from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    {
        path      : '',
        component : NxIntegrationsComponent
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
    providers    : [],
    declarations : [
        NxIntegrationsComponent
    ],
    bootstrap : [],
    exports   : [
        NxIntegrationsComponent
    ]
})
export class IntegrationsModule {
}
