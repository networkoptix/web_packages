import { NgModule }             from '@angular/core';
import { CommonModule }         from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule }      from '@ngx-translate/core';

import { NxLandingComponent }   from './landing.component';
import { ComponentsModule }     from '../../components/components.module';
import { DirectivesModule }     from '../../directives/directives.module';
import { PipesModule } from '@src/pipes/pipes.module';

const appRoutes: Routes = [
    { path: '', component: NxLandingComponent, pathMatch: 'full' }
];

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        PipesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers    : [],
    declarations : [
        NxLandingComponent
    ],
    bootstrap : [],
    exports   : [
        NxLandingComponent
    ]
})
export class LandingModule {
}
