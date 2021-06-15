import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { FormsModule }          from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { NxDebugComponent }     from './debug.component';
import { AuthGuard }            from '../../routeGuards';
import { PipesModule } from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    {
        path: 'debug', component: NxDebugComponent, canActivate: [AuthGuard]
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers    : [],
    declarations : [
        NxDebugComponent
    ],
    bootstrap      : [],
    exports        : [
        NxDebugComponent
    ]
})
export class NxDebugModule {
}
